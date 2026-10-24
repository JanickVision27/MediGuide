
import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import { seedDemoDoctors } from "./controllers/doctors.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import { validateSessionConfiguration } from "./utils/session.js";
import { startAppointmentReminderScheduler } from "./services/appointmentReminderScheduler.js";
import Appointment from "./models/Appointment.js";
import InAppNotification from "./models/InAppNotification.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// Load local environment variables.
// On Render, configure environment variables in the dashboard.
dotenv.config({
  path: path.resolve(currentDirectory, "../../.env"),
});

const app = express();
const port = Number(process.env.PORT) || 5000;

const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.disable("x-powered-by");

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Allow requests without an Origin header, such as health checks.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    },
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// API routes
app.use("/api", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/medicines", medicineRoutes);

// Health-check endpoint
function healthCheck(_req, res) {
  return res.status(200).json({
    status: "ok",
    service: "MediGuide API",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
}

app.get(["/health", "/api/health"], healthCheck);

// Handle unknown API endpoints
app.use("/api", (_req, res) => {
  return res.status(404).json({
    message: "API endpoint not found.",
  });
});

// Global error handler
app.use((error, _req, res, _next) => {
  console.error("MediGuide API error:", error);

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large.",
    });
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Request body contains invalid JSON.",
    });
  }

  if (error?.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      message: "This origin is not allowed.",
    });
  }

  return res.status(500).json({
    message:
      "Something went wrong on the server. Please try again.",
  });
});

export async function startServer() {
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing from the environment variables."
    );
  }

  if (
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
      "Invalid MongoDB URI. It must start with mongodb:// or mongodb+srv://."
    );
  }

  if (/\s/.test(mongoUri)) {
    throw new Error(
      "MONGODB_URI contains whitespace. Check your environment variable."
    );
  }

  // Validate authentication/session configuration.
  validateSessionConfiguration();

  // Connect to MongoDB before accepting requests.
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected successfully");

  await Promise.all([
    Appointment.init(),
    InAppNotification.init(),
  ]);

  await seedDemoDoctors();
  console.log("Demo doctors synchronized");

  startAppointmentReminderScheduler();
  console.log("Appointment reminder scheduler started");

  // Start the server on Render's assigned port.
  return app.listen(port, "0.0.0.0", () => {
    console.log(`MediGuide API listening on port ${port}`);
  });
}

// Start only when this file is executed directly.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === currentFile
) {
  startServer().catch((error) => {
    console.error(
      "Failed to start MediGuide API:",
      error.message
    );

    process.exit(1);
  });
}

export default app;
