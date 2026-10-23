import Appointment from "../models/Appointment.js";
import InAppNotification from "../models/InAppNotification.js";
import User from "../models/User.js";
import {
  isAppointmentReminderEmailConfigured,
  safeEmailProviderFailure,
  sendAppointmentReminder,
} from "./emailService.js";
import { buildReminderSchedule } from "./appointmentReminders.js";

const LEASE_MS = 2 * 60 * 1000;
const TICK_MS = 15 * 1000;

function safeSchedulerError(error) {
  return { code: safeEmailProviderFailure(error).providerCode || "scheduler_error" };
}

async function setReminderFields(appointmentId, reminderId, fields) {
  const values = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [`reminders.$[reminder].${key}`, value]),
  );
  return Appointment.updateOne(
    { _id: appointmentId, "reminders._id": reminderId, "reminders.status": "processing" },
    { $set: values },
    { arrayFilters: [{ "reminder._id": reminderId, "reminder.status": "processing" }] },
  );
}

async function claimReminder(candidate, reminder, now) {
  const claimFilter = reminder.status === "scheduled"
    ? { _id: reminder._id, status: "scheduled", scheduledAt: { $lte: now } }
    : { _id: reminder._id, status: "processing", leaseUntil: { $lte: now } };
  return Appointment.findOneAndUpdate(
    {
      _id: candidate._id,
      status: "Upcoming",
      reminders: { $elemMatch: claimFilter },
    },
    {
      $set: {
        "reminders.$.status": "processing",
        "reminders.$.leaseUntil": new Date(now.getTime() + LEASE_MS),
      },
    },
    { new: true },
  );
}

async function createInAppNotification(appointment, reminder, now) {
  try {
    await InAppNotification.updateOne(
      { reminderId: reminder._id },
      {
        $setOnInsert: {
          userId: appointment.userId,
          appointmentId: appointment._id,
          reminderId: reminder._id,
          offsetMinutes: reminder.offsetMinutes,
          scheduledAt: reminder.scheduledAt,
          deliveredAt: now,
          readAt: null,
        },
      },
      { upsert: true, runValidators: true },
    );
    await setReminderFields(appointment._id, reminder._id, { inAppStatus: "delivered" });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await setReminderFields(appointment._id, reminder._id, { inAppStatus: "delivered" });
  }
}

async function processReminder(candidate, reminder, now) {
  const appointment = await claimReminder(candidate, reminder, now);
  if (!appointment) return;
  const claimed = appointment.reminders.id(reminder._id);
  if (!claimed) return;

  if (claimed.inAppStatus === "pending") {
    await createInAppNotification(appointment, claimed, now);
    claimed.inAppStatus = "delivered";
  }

  // A worker may have stopped after the email request was started. Delivery is
  // uncertain, so record that state rather than retrying and risking a duplicate.
  if (claimed.emailStatus === "sending") {
    await setReminderFields(appointment._id, claimed._id, {
      emailStatus: "unknown",
      status: "processed",
      leaseUntil: null,
    });
    console.warn("Appointment reminder email delivery is uncertain after worker recovery.");
    return;
  }

  if (claimed.emailStatus === "pending") {
    if (!isAppointmentReminderEmailConfigured()) {
      await setReminderFields(appointment._id, claimed._id, {
        emailStatus: "unconfigured",
        emailErrorCode: "email_not_configured",
      });
    } else {
      const user = await User.findById(appointment.userId).select("email");
      if (!user?.email) {
        await setReminderFields(appointment._id, claimed._id, {
          emailStatus: "failed",
          emailErrorCode: "account_unavailable",
        });
      } else {
        const started = await setReminderFields(appointment._id, claimed._id, {
          emailStatus: "sending",
          emailAttemptedAt: now,
        });
        if (!started.modifiedCount) return;
        try {
          const result = await sendAppointmentReminder({
            to: user.email,
            appointment,
            offsetMinutes: claimed.offsetMinutes,
            idempotencyKey: `appointment-reminder/${claimed._id}`,
          });
          if (result.accepted) {
            await setReminderFields(appointment._id, claimed._id, {
              emailStatus: "accepted",
              emailAcceptedAt: new Date(),
              emailErrorCode: "",
            });
            console.info("Appointment reminder email accepted by Resend.");
          } else {
            await setReminderFields(appointment._id, claimed._id, {
              emailStatus: "unconfigured",
              emailErrorCode: "email_not_configured",
            });
            console.warn("Appointment reminder email was skipped because delivery is not configured.");
          }
        } catch (error) {
          const details = safeEmailProviderFailure(error);
          const uncertain = !details.providerStatusCode;
          await setReminderFields(appointment._id, claimed._id, {
            emailStatus: uncertain ? "unknown" : "failed",
            emailErrorCode: details.providerCode,
          });
          console.warn("Appointment reminder email delivery failed.", details);
        }
      }
    }
  }

  await setReminderFields(appointment._id, claimed._id, {
    status: "processed",
    leaseUntil: null,
  });
}

export async function processDueAppointmentReminders(now = new Date()) {
  const legacyAppointments = await Appointment.find({
    status: "Upcoming",
    remindersInitialized: { $ne: true },
  }).limit(100);
  for (const appointment of legacyAppointments) {
    const preferences = appointment.reminderPreferences || { enabled: true, offsetsMinutes: [1440, 120] };
    const reminders = buildReminderSchedule({
      date: appointment.date,
      time: appointment.time,
      timeZone: appointment.timeZone || "Asia/Kolkata",
      offsetsMinutes: preferences.offsetsMinutes || [1440, 120],
      enabled: preferences.enabled !== false,
      now,
    });
    await Appointment.updateOne(
      { _id: appointment._id, status: "Upcoming", remindersInitialized: { $ne: true } },
      { $set: { reminders, remindersInitialized: true } },
    );
  }

  await Appointment.updateMany(
    { status: { $in: ["Completed", "Cancelled"] }, reminders: { $elemMatch: { status: { $in: ["scheduled", "processing"] }, emailStatus: "pending" } } },
    { $set: {
      "reminders.$[reminder].status": "cancelled",
      "reminders.$[reminder].inAppStatus": "cancelled",
      "reminders.$[reminder].emailStatus": "cancelled",
    } },
    { arrayFilters: [{ "reminder.status": { $in: ["scheduled", "processing"] }, "reminder.emailStatus": "pending" }] },
  );
  const candidates = await Appointment.find({
    status: "Upcoming",
    $or: [
      { reminders: { $elemMatch: { status: "scheduled", scheduledAt: { $lte: now } } } },
      { reminders: { $elemMatch: { status: "processing", leaseUntil: { $lte: now } } } },
    ],
  }).limit(100);

  for (const appointment of candidates) {
    const reminder = appointment.reminders.find((item) =>
      (item.status === "scheduled" && item.scheduledAt <= now) ||
      (item.status === "processing" && item.leaseUntil && item.leaseUntil <= now),
    );
    if (!reminder) continue;
    try {
      await processReminder(appointment, reminder, now);
    } catch (error) {
      console.error("Appointment reminder processing failed.", safeSchedulerError(error));
      await setReminderFields(appointment._id, reminder._id, {
        status: "scheduled",
        leaseUntil: null,
      }).catch(() => {});
    }
  }
}

export function startAppointmentReminderScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processDueAppointmentReminders();
    } catch (error) {
      console.error("Appointment reminder scheduler tick failed.", safeSchedulerError(error));
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, TICK_MS);
  timer.unref?.();
  void tick();
  return () => clearInterval(timer);
}
