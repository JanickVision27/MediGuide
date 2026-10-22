import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => value.length === 2 && value.every(Number.isFinite),
        message: "Hospital coordinates must contain [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    osmId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 240 },
    address: { type: String, default: "", trim: true, maxlength: 500 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    cityKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    state: { type: String, default: "", trim: true, maxlength: 100 },
    location: { type: pointSchema, required: true },
    imageUrl: { type: String, default: "", trim: true, maxlength: 4096 },
    source: { type: String, default: "OpenStreetMap", trim: true },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    lastFetchedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ cityKey: 1, lastFetchedAt: -1 });
hospitalSchema.index({ cityKey: 1, name: 1 });
hospitalSchema.index({ location: "2dsphere" });

export default mongoose.model("Hospital", hospitalSchema);
