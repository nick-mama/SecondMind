import { Router, Request, Response } from "express";
import { ingestionQueue } from "../lib/queues";
import type { IngestionJobData } from "../types/ingestion";

const router = Router();

router.post("/test", async (req: Request, res: Response) => {
  const jobData: IngestionJobData = {
    userId: req.body.userId || "test-user",
    source: "upload",
    sourceId: `test-${Date.now()}`,
    title: req.body.title || "Test Document",
    content:
      req.body.content || "This is test content for the ingestion pipeline.",
    metadata: { test: true },
  };

  const job = await ingestionQueue.add("ingest-document", jobData);
  res.json({ message: "Job queued", jobId: job.id });
});

router.get("/status/:jobId", async (req: Request, res: Response) => {
  const job = await ingestionQueue.getJob(req.params.jobId as string);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const state = await job.getState();
  const progress = job.progress;
  res.json({ jobId: job.id, state, progress, result: job.returnvalue });
});

export default router;
