import dns from "node:dns";
// 1. Force Node.js to use public DNS servers (fixes the SRV ECONNREFUSED error)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chatRoutes from "./routes/chatRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

// Load the .env file from the project root
dotenv.config({
  path: path.resolve(currentDirectory, "../../.env"),
});

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api", chatRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medicines", medicineRoutes);

// Health-check route
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "MediGuide API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// 2. Simplified clean database connection routine
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

app.listen(port, () => {
  console.log(`MediGuide API listening on http://localhost:${port}`);
});

void connectToDatabase();
