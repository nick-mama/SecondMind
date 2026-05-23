export interface ParsedFile {
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export async function parseFile(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
): Promise<ParsedFile> {
  const title = originalname.replace(/\.[^/.]+$/, "");

  switch (mimetype) {
    case "application/pdf": {
      // PDF parsing temporarily disabled — will add back in Phase 7
      // when we set up proper file storage with AWS S3
      return {
        title,
        content: `[PDF document: ${originalname}. Full text extraction coming in Phase 7.]`,
        metadata: { fileType: "pdf", parseStatus: "pending" },
      };
    }

    case "text/plain":
    case "text/markdown": {
      return {
        title,
        content: buffer.toString("utf-8"),
        metadata: { fileType: "text" },
      };
    }

    case "application/json": {
      const json = JSON.parse(buffer.toString("utf-8"));
      return {
        title,
        content: JSON.stringify(json, null, 2),
        metadata: { fileType: "json" },
      };
    }

    default:
      throw new Error(`Unsupported file type: ${mimetype}`);
  }
}
