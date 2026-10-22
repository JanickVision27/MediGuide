import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import appointmentRoutes from "./routes/appointmentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import {
  doctorRouter,
  hospitalRouter,
} from "./routes/directoryRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDirectory, "../../.env"),
});

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Non-browser and same-origin requests may not send an Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/hospitals", hospitalRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/medicines", medicineRoutes);
app.use("/api", chatRoutes);

function healthCheck(_req, res) {
  return res.status(200).json({
    status: "ok",
    service: "MediGuide API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
}

app.get("/api/health", healthCheck);
// Retain the old health path for existing local tooling.
app.get("/health", healthCheck);

app.use("/api", (_req, res) => {
  return res.status(404).json({ message: "API endpoint not found." });
});

app.use((error, _req, res, _next) => {
  console.error("MediGuide API error:", error);

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body contains invalid JSON." });
  }

  return res.status(500).json({
    message: "Something went wrong on the server. Please try again.",
  });
});

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    console.error("MONGODB_URI is missing from your configuration.");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

// Export the Express app for tests, but only listen when run as the entry point.
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  app.listen(port, () => {
    console.log(`MediGuide API listening on http://localhost:${port}`);
  });
  void connectToDatabase();
}

export { connectToDatabase };
export default app;
