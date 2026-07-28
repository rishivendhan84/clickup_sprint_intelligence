/**
 * Sprint Intelligence — API Server
 *
 * Express server that serves pre-processed sprint analytics
 * from ClickUp. In production, also serves the built React frontend.
 */

import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import sprintRoutes from "./routes/sprintRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();

// ─── Middleware ─────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? false                              // same-origin in prod
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

app.use(express.json());

// Request logger (development only)
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`  ${req.method} ${req.path}`);
    next();
  });
}

// ─── API Routes ────────────────────────────────────────────────────

app.use("/api", sprintRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Static frontend (production) ──────────────────────────────────

const clientDist = join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith("/api")) return next();
  res.sendFile(join(clientDist, "index.html"), (err) => {
    if (err) next(); // falls through to 404 handler
  });
});

// ─── Error handling ────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("");
  const lines = [
    "Sprint Intelligence API Server",
    `http://localhost:${PORT}`,
    "",
    "GET /api/sprints",
    "GET /api/sprint/:id/summary",
    "GET /api/sprint/:id/tasks",
    "GET /api/sprint/:id/members",
    "GET /api/sprint/:id/wbs",
  ];
  const width = Math.max(...lines.map((l) => l.length)) + 6;

  console.log(`  ┌${"─".repeat(width)}┐`);
  for (const line of lines) {
    console.log(`  │   ${line.padEnd(width - 3)}│`);
  }
  console.log(`  └${"─".repeat(width)}┘`);
  console.log("");
});
