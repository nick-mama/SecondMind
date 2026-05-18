import express from "express";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(cookieParser()); // parse cookies (needed for auth tokens)

// Health check route — always have one of these
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
