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
const DB_RETRY_MS = 15000;

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
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

/**
 * Connect to MongoDB without ever stopping the process.
 * If the database is unreachable the API keeps serving; database-backed routes
 * answer 503 and the connection is retried in the background.
 */
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    console.warn(
      "MONGODB_URI is missing from the root .env file. Database features are disabled."
    );
    return;
  }

  // Check the URI format without printing credentials
  if (
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    console.error(
      "Invalid MongoDB URI format. It must start with mongodb:// or mongodb+srv://. Database features are disabled."
    );
    return;
  }

  if (/\s/.test(mongoUri)) {
    console.error(
      "MONGODB_URI contains whitespace. Check your .env file. Database features are disabled."
    );
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(
      `MongoDB unavailable (${error.message}). Retrying in ${DB_RETRY_MS / 1000}s.`
    );
    setTimeout(connectToDatabase, DB_RETRY_MS);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Database routes will return 503 until it reconnects.");
});
mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});
mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

// Keep the process alive no matter what the database does.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason?.message || reason);
});

app.listen(port, () => {
  console.log(`MediGuide API listening on http://localhost:${port}`);
});

void connectToDatabase();
