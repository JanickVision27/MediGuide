import mongoose from "mongoose";

import Appointment from "../models/appointment.js";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getAppointments(req, res, next) {
  try {
    const appointments = await Appointment.find({ userId: req.userId }).sort({
      date: 1,
      time: 1,
      createdAt: -1,
    });

    return res.status(200).json({ appointments });
  } catch (error) {
    return next(error);
  }
}

export async function createAppointment(req, res, next) {
  try {
    const { doctor, specialty, date, time, reason = "" } = req.body;

    if (date < localDateString()) {
      return res.status(400).json({
        message: "Appointment date cannot be in the past.",
      });
    }

    const conflict = await Appointment.exists({
      userId: req.userId,
      doctor,
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
      doctor,
      specialty,
      date,
      time,
      reason,
      status: "Upcoming",
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
      { status: "Cancelled" },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Upcoming appointment not found.",
      });
    }

    return res.status(200).json({
      message: "Appointment cancelled successfully.",
      appointment,
    });
  } catch (error) {
    return next(error);
  }
}
