import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import authRouter from "./routes/auth";
import ingestionRouter from "./routes/ingestion";
import "./workers/ingestionWorker";
import "./workers/chunkingWorker";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/auth", authRouter);
app.use("/ingestion", ingestionRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
