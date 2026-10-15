import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chatRoutes from "./routes/chatRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";

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

// Health-check route
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "MediGuide API",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Connect to MongoDB and start the server
async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI?.trim();

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI is missing from the root .env file."
      );
    }

    // Check the URI format without printing credentials
    if (
      !mongoUri.startsWith("mongodb://") &&
      !mongoUri.startsWith("mongodb+srv://")
    ) {
      throw new Error(
        "Invalid MongoDB URI format. It must start with mongodb:// or mongodb+srv://."
      );
    }

    if (/\s/.test(mongoUri)) {
      throw new Error(
        "MONGODB_URI contains whitespace. Check your .env file."
      );
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");

    app.listen(port, () => {
      console.log(
        `MediGuide API listening on http://localhost:${port}`
      );
    });
  } catch (error) {
    console.error("Failed to start MediGuide API:", error.message);
    process.exit(1);
  }
}

startServer();