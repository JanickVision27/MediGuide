
import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
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
import { allowedOrigins, corsMiddleware } from "./middleware/cors.js";
import { getEmailHealth, logEmailConfiguration } from "./services/emailService.js";
import { listAllowedOrigins } from "./utils/corsOrigins.js";
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

// Render/Vercel put the app behind a reverse proxy. Without this, express-rate-limit
// cannot read the caller's IP and every visitor shares a single rate-limit bucket.
// Override with TRUST_PROXY when the number of proxy hops changes.
function parseTrustProxy(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return 1;
  if (trimmed === "false") return false;
  if (trimmed === "true") return true;

  const asNumber = Number(trimmed);
  return Number.isInteger(asNumber) ? asNumber : trimmed;
}

app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

app.disable("x-powered-by");

// Allows the deployed Vercel frontend, preview deployments, and localhost.
app.use(corsMiddleware);

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

// Email configuration diagnostics. Exposes booleans and the sender address only;
// API keys are never returned.
app.get(["/health/email", "/api/health/email"], (_req, res) => {
  return res.status(200).json(getEmailHealth());
});

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

  // Report the active email provider and any missing variables on boot, so a
  // misconfigured deployment can never silently drop notifications.
  logEmailConfiguration();

  console.log(
    `CORS allow-list: ${listAllowedOrigins(allowedOrigins).join(", ") || "(none)"}` +
      (allowedOrigins.patterns.length ? " + wildcard patterns" : "") +
      (allowedOrigins.allowAny ? " + ANY ORIGIN (CORS_ALLOW_ANY_ORIGIN=true)" : "")
  );

  // Connect to MongoDB before accepting requests. A misconfigured URI should
  // fail fast instead of burning through Render's boot window on the default
  // 30s server-selection timeout.
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
  });
  console.log("MongoDB connected successfully");

  // Start listening immediately. On Render's free tier every millisecond before
  // listen() lengthens the cold start, during which the platform serves its
  // "Application loading" page (surfaced to the Vercel proxy as a 502) and the
  // visitor's /api/auth/me session check stalls. Index creation, demo seeding
  // and the in-process scheduler are not needed to answer the first request, so
  // they run as background warm-up instead of blocking the boot.
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`MediGuide API listening on port ${port}`);
  });

  void warmUpAfterListen();

  return server;
}

// Post-listen warm-up. Each step is isolated: a failure (for example a slow
// Atlas response on a cold start) is logged and retried on the next deploy,
// instead of crashing the process and sending Render into a crash loop.
async function warmUpAfterListen() {
  try {
    await Promise.all([
      Appointment.init(),
      InAppNotification.init(),
    ]);
  } catch (error) {
    console.error("Index initialization failed:", error.message);
  }

  try {
    await seedDemoDoctors();
    console.log("Demo doctors synchronized");
  } catch (error) {
    console.error("Demo doctor seeding failed:", error.message);
  }

  try {
    startAppointmentReminderScheduler();
    console.log("Appointment reminder scheduler started");
  } catch (error) {
    console.error("Reminder scheduler failed to start:", error.message);
  }
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
