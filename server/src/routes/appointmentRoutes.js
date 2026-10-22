import express from "express";

import {
  cancelAppointment,
  createAppointment,
  getAppointments,
} from "../controllers/appointments.js";
import requireAuth from "../middleware/requireAuth.js";
import { validateAppointment } from "../validators/appointmentValidator.js";

const router = express.Router();

// Every appointment operation is scoped to the user in the verified session.
router.use(requireAuth);
router.get("/", getAppointments);
router.post("/", validateAppointment, createAppointment);
router.patch("/:id/cancel", cancelAppointment);

export default router;
