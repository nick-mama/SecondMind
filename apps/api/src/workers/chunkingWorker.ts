import { Worker, Job } from "bullmq";
import { prisma } from "@secondmind/db";

export interface ChunkingJobData {
  documentId: string;
  content: string;
}

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// CHUNKING STRATEGY
// Example with chunkSize=500, overlap=50:
// Chunk 1: characters 0-500
// Chunk 2: characters 450-950   ← 50 char overlap with chunk 1
// Chunk 3: characters 900-1400  ← 50 char overlap with chunk 2
//
// overlap ensures that sentences split across chunk boundaries
// don't lose context. A sentence at the end of chunk 1 also
// appears at the start of chunk 2.

function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap; // move forward by chunkSize minus overlap
  }

  return chunks;
}

export const chunkingWorker = new Worker<ChunkingJobData>(
  "document-chunking",
  async (job: Job<ChunkingJobData>) => {
    const { documentId, content } = job.data;

    console.log(`Chunking document ${documentId}`);

    await job.updateProgress(10);

    const chunks = chunkText(content);
    console.log(`Split into ${chunks.length} chunks`);

    await job.updateProgress(30);

    // Delete existing chunks first (in case of re-processing)
    await prisma.chunk.deleteMany({ where: { documentId } });

    // Create all chunks in one database transaction
    // If any chunk fails to save, ALL are rolled back
    await prisma.$transaction(
      chunks.map((chunkContent, index) =>
        prisma.chunk.create({
          data: {
            documentId,
            content: chunkContent,
            chunkIndex: index,
            metadata: {
              charStart: index * (500 - 50),
              charEnd: index * (500 - 50) + chunkContent.length,
            },
          },
        }),
      ),
    );

    await job.updateProgress(100);

    console.log(`Created ${chunks.length} chunks for document ${documentId}`);
    return { success: true, chunkCount: chunks.length };
  },
  { connection, concurrency: 3 },
);

chunkingWorker.on("completed", (job) => {
  console.log(`Chunking job ${job.id} completed`);
});

chunkingWorker.on("failed", (job, err) => {
  console.error(`Chunking job ${job?.id} failed:`, err.message);
});
