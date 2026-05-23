export interface IngestionJobData {
  userId: string;
  source: "gmail" | "notion" | "google_docs" | "canvas" | "upload";
  sourceId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChunkingJobData {
  documentId: string;
  content: string;
}
