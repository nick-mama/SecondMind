import { Router, Request, Response } from "express";
import multer from "multer";
import { parseFile } from "../lib/fileParser";
import { ingestionQueue } from "../lib/queues";

const router = Router();

// Store files in memory as Buffers instead of saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  },
});

// POST /upload — upload a file and queue it for ingestion
router.post(
  "/",
  upload.single("file"), // 'file' is the field name in the form
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Get userId from session cookie
    const userId = req.body.userId;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

    try {
      // Parse the file buffer into text content
      const parsed = await parseFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );

      // Queue the document for ingestion
      const job = await ingestionQueue.add("ingest-document", {
        userId,
        source: "upload",
        sourceId: `upload-${Date.now()}-${req.file.originalname}`,
        title: parsed.title,
        content: parsed.content,
        metadata: {
          ...parsed.metadata,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });

      res.json({
        message: "File uploaded and queued for processing",
        jobId: job.id,
        title: parsed.title,
        contentLength: parsed.content.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  },
);

export default router;
