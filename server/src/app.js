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

dotenv.config({ path: path.resolve(currentDirectory, "../../.env") });

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (
  process.env.CLIENT_ORIGIN ||
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"
)
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
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/medicines", medicineRoutes);

function healthCheck(_req, res) {
  return res.status(200).json({
    status: "ok",
    service: "MediGuide API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
}

app.get(["/health", "/api/health"], healthCheck);

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

export async function startServer() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the root .env file.");
  }
  if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
    throw new Error(
      "Invalid MongoDB URI format. It must start with mongodb:// or mongodb+srv://."
    );
  }
  if (/\s/.test(mongoUri)) {
    throw new Error("MONGODB_URI contains whitespace. Check your .env file.");
  }

  // Fail fast on insecure/missing production auth configuration.
  validateSessionConfiguration();

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected successfully");

  await Promise.all([Appointment.init(), InAppNotification.init()]);

  await seedDemoDoctors();
  console.log("Synthetic demo doctors synchronized");

  startAppointmentReminderScheduler();
  console.log("Persistent appointment reminder scheduler started");

  return app.listen(port, () => {
    console.log(`MediGuide API listening on http://localhost:${port}`);
  });
}

// Export the app for tests; only connect/listen when run as the entry point.
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  startServer().catch((error) => {
    console.error("Failed to start MediGuide API:", error.message);
    process.exit(1);
  });
}

export default app;
