import mongoose from "mongoose";

const inAppNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  reminderId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  offsetMinutes: { type: Number, enum: [1440, 120, 60, 30], required: true },
  scheduledAt: { type: Date, required: true },
  deliveredAt: { type: Date, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

inAppNotificationSchema.index({ userId: 1, readAt: 1, deliveredAt: -1 });

export default mongoose.model("InAppNotification", inAppNotificationSchema);
