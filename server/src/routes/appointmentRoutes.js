
import express from "express";

import {
  getAppointments,
  createAppointment,
  cancelAppointment
} from "../controllers/appointments.js";

const router = express.Router();

router.get("/", getAppointments);
router.post("/", createAppointment);
router.patch("/:id/cancel", cancelAppointment);

export default router;
