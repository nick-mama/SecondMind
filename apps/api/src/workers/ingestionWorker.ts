import { Worker, Job } from "bullmq";
import { prisma } from "@secondmind/db";
import { Prisma } from "@secondmind/db";
import { extractMetadata } from "../lib/metadataExtractor";
import type { IngestionJobData } from "../types/ingestion";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

export const ingestionWorker = new Worker<IngestionJobData>(
  "document-ingestion",
  async (job: Job<IngestionJobData>) => {
    const { userId, source, sourceId, title, content, metadata } = job.data;

    console.log(
      `Processing ingestion job ${job.id} for user ${userId} from ${source}`,
    );
    await job.updateProgress(10);

    const existing = await prisma.document.findFirst({
      where: {
        userId,
        source,
        metadata: { path: ["sourceId"], equals: sourceId },
      },
    });

    if (existing) {
      console.log(`Document ${sourceId} already exists, skipping`);
      return { skipped: true, documentId: existing.id };
    }

    await job.updateProgress(40);

    // Extract metadata from content
    const extracted = extractMetadata(content);

    const document = await prisma.document.create({
      data: {
        userId,
        title,
        source,
        content,
        metadata: {
          sourceId,
          ...metadata,
          extracted,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await job.updateProgress(80);

    const { chunkingQueue } = await import("../lib/queues");
    await chunkingQueue.add("chunk-document", {
      documentId: document.id,
      content,
    });

    await job.updateProgress(100);
    console.log(`Document ${document.id} created, added to chunking queue`);
    return { success: true, documentId: document.id };
  },
  { connection, concurrency: 5 },
);

ingestionWorker.on("completed", (job) => {
  console.log(`Ingestion job ${job.id} completed`);
});

ingestionWorker.on("failed", (job, err) => {
  console.error(`Ingestion job ${job?.id} failed:`, err.message);
});
