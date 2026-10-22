import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
      immutable: true,
    },
  },
  { timestamps: true }
);

doctorSchema.index({ active: 1, name: 1, specialty: 1 });

export default mongoose.model("Doctor", doctorSchema);
