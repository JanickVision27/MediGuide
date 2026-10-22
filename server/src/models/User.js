import mongoose from "mongoose";

const optionalText = (maxLength) => ({
  type: String,
  default: "",
  trim: true,
  maxlength: maxLength,
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["patient"],
      default: "patient",
      immutable: true,
    },
    dob: optionalText(10),
    phone: optionalText(20),
    city: optionalText(80),
    state: optionalText(80),
    address: optionalText(240),
    bloodType: {
      type: String,
      enum: ["", "Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: "",
    },
    allergies: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
      validate: {
        validator: (items) => items.length <= 20,
        message: "No more than 20 allergy entries are allowed",
      },
    },
    medications: {
      type: [{ type: String, trim: true, maxlength: 160 }],
      default: [],
      validate: {
        validator: (items) => items.length <= 30,
        message: "No more than 30 medication entries are allowed",
      },
    },
    emergencyName: optionalText(80),
    relationship: optionalText(60),
    emergencyPhone: optionalText(40),
    emergencyAddress: optionalText(240),
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_document, returned) => {
        delete returned._id;
        delete returned.__v;
        delete returned.passwordHash;
        return returned;
      },
    },
  }
);

export default mongoose.model("User", userSchema);
