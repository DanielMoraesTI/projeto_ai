import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import taskRoutes from "./routes/taskRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import taskService from "./services/taskService.js";

const app = express();
const currentDirPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootPath = path.resolve(currentDirPath, "..");
const publicPath = path.join(projectRootPath, "public");

app.use(express.json());
app.use(cors());
app.use(express.static(publicPath));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "task-api",
      geminiConfigured: taskService.isGeminiConfigured(),
    },
  });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/", streamRoutes);

app.get("/index.html", (req, res) => {
  res.redirect(301, "/");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

export default app;
