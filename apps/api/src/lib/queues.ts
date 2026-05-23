import { Queue } from "bullmq";

// This is the connection config BullMQ needs to connect to Redis.
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// QUEUES
// Handles ingesting documents from external sources (Gmail, Notion, etc.)
export const ingestionQueue = new Queue("document-ingestion", { connection });

// Handles breaking documents into chunks and extracting metadata
export const chunkingQueue = new Queue("document-chunking", { connection });

// Log queue sizes on startup so you can see if jobs are backing up
ingestionQueue.getJobCounts().then((counts) => {
  console.log("Ingestion queue:", counts);
});

chunkingQueue.getJobCounts().then((counts) => {
  console.log("Chunking queue:", counts);
});
