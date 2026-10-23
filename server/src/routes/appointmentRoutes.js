import express from "express";

import {
  cancelAppointment,
  createAppointment,
  getAppointments,
} from "../controllers/appointments.js";
import {
  getUserReminders,
  markAllNotificationsRead,
  updateAppointmentChecklist,
  updateAppointmentReminders,
  updateNotificationReadState,
} from "../controllers/reminders.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  readinessChecklistSchema,
  reminderPreferencesSchema,
  validateAppointment,
  validateBody,
} from "../validators/appointmentValidator.js";

const router = express.Router();

router.use(requireAuth);
router.get("/reminders", getUserReminders);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", updateNotificationReadState);
router.get("/", getAppointments);
router.post("/", validateAppointment, createAppointment);
router.patch("/:id/reminders", validateBody(reminderPreferencesSchema), updateAppointmentReminders);
router.patch("/:id/checklist", validateBody(readinessChecklistSchema), updateAppointmentChecklist);
router.patch("/:id/cancel", cancelAppointment);

export default router;
