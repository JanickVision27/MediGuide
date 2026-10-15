import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },

    patientEmail: {
      type: String,
      default: "",
      trim: true,
    },

    doctor: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
    },

    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      trim: true,
    },

    date: {
      type: String,
      required: [true, "Appointment date is required"],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must be in YYYY-MM-DD format",
      ],
    },

    time: {
      type: String,
      required: [true, "Appointment time is required"],
      match: [
        /^(?:[01]\d|2[0-3]):[0-5]\d$/,
        "Time must be in HH:mm format",
      ],
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;