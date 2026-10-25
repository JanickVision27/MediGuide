import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import {
  getEmailConfiguration,
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
} from "../services/emailService.js";
import { completeFinishedAppointments } from "../services/appointmentLifecycle.js";
import { appointmentDateTimeToUtc, buildReminderSchedule, DEFAULT_REMINDER_OFFSETS } from "../services/appointmentReminders.js";

export async function getAppointments(req, res, next) {
  try {
    // Settle statuses before reading so finished appointments never come back as
    // "Upcoming". This keeps the list correct even when the background scheduler
    // was asleep (for example on a free hosting tier).
    await completeFinishedAppointments({ userId: req.userId }).catch((error) => {
      console.error("Appointment completion sweep failed.", error?.message);
    });

    const appointments = await Appointment.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    return res.status(200).json(appointments);
  } catch (error) {
    return next(error);
  }
}

export async function createAppointment(req, res, next) {
  try {
    const { doctor, specialty, hospital, date, time, timeZone, reason = "" } = req.body;

    if (!hospital) {
      return res.status(400).json({
        message: "Select a hospital location for the appointment.",
      });
    }

    let appointmentAt;
    try {
      appointmentAt = appointmentDateTimeToUtc(date, time, timeZone);
    } catch {
      return res.status(400).json({ message: "Select a valid appointment time and timezone." });
    }
    if (appointmentAt <= new Date()) {
      return res.status(400).json({
        message: "Appointment time must be in the future.",
      });
    }

    // Never trust provider details posted by the browser. The selected doctor
    // must still be active in the current directory.
    const selectedDoctor = await Doctor.findOne({
      name: doctor,
      specialty,
      active: true,
    }).select("name specialty");
    if (!selectedDoctor) {
      return res.status(400).json({
        message: "Please choose a provider from the current directory.",
      });
    }

    const conflict = await Appointment.exists({
      userId: req.userId,
      doctor: selectedDoctor.name,
      date,
      time,
      status: "Upcoming",
    });
    if (conflict) {
      return res.status(409).json({
        message: "You already have this doctor booked at that time.",
      });
    }

    const appointment = await Appointment.create({
      userId: req.userId,
      patientName: req.user.fullName,
      patientEmail: req.user.email,
      doctor: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      // Preserve the selected directory result with the booking. Later changes
      // to a live hospital listing must not rewrite an existing appointment.
      hospital,
      date,
      time,
      timeZone,
      reminderPreferences: { enabled: true, offsetsMinutes: [...DEFAULT_REMINDER_OFFSETS] },
      reminders: buildReminderSchedule({ date, time, timeZone }),
      remindersInitialized: true,
      readinessChecklist: {},
      reason,
      status: "Upcoming",
    });

    // Notification delivery is deliberately fire-and-forget. A Resend outage or
    // missing key must never roll back or delay an otherwise successful booking.
    void sendAppointmentConfirmation({
      to: appointment.patientEmail,
      patientName: appointment.patientName,
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      hospital: appointment.hospital,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
    }).catch((error) => {
      console.error("Appointment confirmation email delivery failed.");
    });

    return res.status(201).json({
      message: "Appointment created successfully.",
      appointment,
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
        status: "Upcoming",
      },
      { $set: {
        status: "Cancelled",
        "reminders.$[reminder].status": "cancelled",
        "reminders.$[reminder].inAppStatus": "cancelled",
        "reminders.$[reminder].emailStatus": "cancelled",
      } },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{
          "reminder.status": { $in: ["scheduled", "processing"] },
          "reminder.emailStatus": "pending",
        }],
      }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Upcoming appointment not found.",
      });
    }

    // Cancellation notice is fire-and-forget: the record is already cancelled, so
    // a provider outage must not turn a successful cancellation into an error.
    void sendAppointmentCancellation({
      to: appointment.patientEmail,
      patientName: appointment.patientName,
      doctor: appointment.doctor,
      specialty: appointment.specialty,
      hospital: appointment.hospital,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
    }).catch((error) => {
      console.error("Appointment cancellation email delivery failed.", error?.message);
    });

    return res.status(200).json({
      message: "Appointment cancelled successfully.",
      // Surface delivery state so the client can tell the patient what happened.
      notification: getEmailConfiguration().configured
        ? { email: "queued" }
        : { email: "unavailable" },
      appointment,
    });
  } catch (error) {
    return next(error);
  }
}
