import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { clearSession, createSession } from "../utils/session.js";

const BCRYPT_ROUNDS = 12;
// Make unknown-email logins perform a comparable bcrypt operation.
const DUMMY_PASSWORD_HASH =
  "$2b$12$ldgVALHVd3.ALLIk0g763..jNyVmTORREW7mR2TooS8tki310MB6m";

function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    dob: user.dob || "",
    phone: user.phone || "",
    city: user.city || "",
    state: user.state || "",
    address: user.address || "",
    bloodType: user.bloodType || "",
    allergies: Array.isArray(user.allergies) ? [...user.allergies] : [],
    medications: Array.isArray(user.medications) ? [...user.medications] : [],
    emergencyName: user.emergencyName || "",
    relationship: user.relationship || "",
    emergencyPhone: user.emergencyPhone || "",
    emergencyAddress: user.emergencyAddress || "",
  };
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: "patient",
    });

    createSession(res, user._id);
    return res.status(201).json({
      message: "Account created successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists. Try signing in instead.",
      });
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash || DUMMY_PASSWORD_HASH
    );

    if (!user || !passwordMatches) {
      return res.status(401).json({
        message: "The email address or password is incorrect.",
      });
    }

    createSession(res, user._id);
    return res.status(200).json({
      message: "Signed in successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export function currentUser(req, res) {
  return res.status(200).json({ user: publicUser(req.user) });
}

export function logout(_req, res) {
  clearSession(res);
  return res.status(200).json({ message: "Signed out successfully." });
}

export async function updateProfile(req, res, next) {
  try {
    Object.assign(req.user, req.body);
    await req.user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: publicUser(req.user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Another account already uses this email address.",
      });
    }
    return next(error);
  }
}
