import mongoose from "mongoose";

const profilePhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    contentType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp"],
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ProfilePhoto", profilePhotoSchema);
