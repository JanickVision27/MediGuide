import Appointment from "../models/appointment.js";

// Validate date format: YYYY-MM-DD
function validDate(date) {
  if (typeof date !== "string") {
    return false;
  }

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}
// Validate time format: HH:mm (24-hour format)
function validTime(time) {
  return (
    typeof time === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
}

// GET: Get all appointments
export async function getAppointments(req, res) {
  try {
    const filter = {};

    if (req.query.patientEmail) {
      filter.patientEmail = req.query.patientEmail;
    }

    const appointments = await Appointment.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch appointments",
    });
  }
}

// POST: Create an appointment
export async function createAppointment(req, res) {
  try {
    const {
      patientName,
      patientEmail,
      doctor,
      specialty,
      date,
      time,
      reason,
    } = req.body;

    // Check date and time
  console.log("Request body:", req.body);
console.log("Date value:", date, typeof date);
console.log("Time value:", time, typeof time);

if (!validDate(date)) {
  return res.status(400).json({
    message: "Invalid date",
    receivedDate: date
  });
}

if (!validTime(time)) {
  return res.status(400).json({
    message: "Invalid time",
    receivedTime: time
  });
}
    // Reject past dates (server's local date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDay = new Date(`${date}T00:00:00`);
    if (appointmentDay < today) {
      return res.status(400).json({
        message: "Appointment date cannot be in the past",
      });
    }

    // Check required fields
    if (!patientName || !doctor || !specialty) {
      return res.status(400).json({
        message: "Please provide patient name, doctor, and specialty",
      });
    }

    // Save appointment to MongoDB
    const appointment = await Appointment.create({
      patientName,
      patientEmail,
      doctor,
      specialty,
      date,
      time,
      reason,
      status: "Upcoming",
    });

    return res.status(201).json({
      message: "Appointment created successfully",
      appointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error.message);

    return res.status(500).json({
      message: "Failed to create appointment",
    });
  }
}

// PATCH: Cancel an appointment
export async function cancelAppointment(req, res) {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: "Cancelled" },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error.message);

    return res.status(400).json({
      message: "Unable to cancel appointment. Check the appointment ID.",
    });
  }
}