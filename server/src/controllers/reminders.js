import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";
import InAppNotification from "../models/InAppNotification.js";
import { applyReminderPreferences } from "../services/appointmentReminders.js";

export async function getUserReminders(req, res, next) {
  try {
    const [appointments, notifications] = await Promise.all([
      Appointment.find({ userId: req.userId, status: "Upcoming" })
        .select("date time timeZone reminders reminderPreferences")
        .lean(),
      InAppNotification.find({ userId: req.userId }).sort({ deliveredAt: -1 }).limit(30).lean(),
    ]);
    const reminders = appointments.flatMap((appointment) =>
      (appointment.reminders || []).map((reminder) => ({
        id: reminder._id.toString(),
        appointmentId: appointment._id.toString(),
        offsetMinutes: reminder.offsetMinutes,
        scheduledAt: reminder.scheduledAt,
        status: reminder.status,
        inAppStatus: reminder.inAppStatus,
        emailStatus: reminder.emailStatus,
        emailErrorCode: reminder.emailErrorCode || "",
      })),
    );
    return res.status(200).json({
      reminders,
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        appointmentId: notification.appointmentId.toString(),
        offsetMinutes: notification.offsetMinutes,
        scheduledAt: notification.scheduledAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAppointmentReminders(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: "Upcoming",
    });
    if (!appointment) return res.status(404).json({ message: "Upcoming appointment not found." });

    const { enabled, offsetsMinutes } = req.body;
    applyReminderPreferences(appointment, req.body);
    await appointment.save();
    return res.status(200).json({
      message: "Reminder preferences updated.",
      appointmentId: appointment._id.toString(),
      reminderPreferences: appointment.reminderPreferences,
      reminders: appointment.reminders,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAppointmentChecklist(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, status: "Upcoming" },
      { $set: { readinessChecklist: req.body } },
      { new: true, runValidators: true },
    );
    if (!appointment) return res.status(404).json({ message: "Upcoming appointment not found." });
    return res.status(200).json({ readinessChecklist: appointment.readinessChecklist });
  } catch (error) {
    return next(error);
  }
}

export async function updateNotificationReadState(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID." });
    }
    const notification = await InAppNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await InAppNotification.updateMany(
      { userId: req.userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.status(200).json({ message: "Notifications marked as read." });
  } catch (error) {
    return next(error);
  }
}
