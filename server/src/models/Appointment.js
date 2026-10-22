import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
      maxlength: 80,
    },
    patientEmail: {
      type: String,
      required: [true, "Patient email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    doctor: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      maxlength: 120,
    },
    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      trim: true,
      maxlength: 120,
    },
    date: {
      type: String,
      required: [true, "Appointment date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    time: {
      type: String,
      required: [true, "Appointment time is required"],
      match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"],
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ userId: 1, date: 1, time: 1 });

export default mongoose.model("Appointment", appointmentSchema);
