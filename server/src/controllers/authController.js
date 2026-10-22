import bcrypt from "bcryptjs";

import User from "../models/user.js";
import { clearSession, createSession } from "../utils/session.js";

const BCRYPT_ROUNDS = 12;
// Used to make an unknown-email login perform a comparable bcrypt operation.
const DUMMY_PASSWORD_HASH =
  "$2b$12$ldgVALHVd3.ALLIk0g763..jNyVmTORREW7mR2TooS8tki310MB6m";

function isDuplicateEmail(error) {
  // Email is the only unique user field; drivers do not all expose keyPattern.
  return error?.code === 11000;
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ fullName, email, passwordHash });

    createSession(res, user._id);
    return res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({
        message: "An account already exists for this email address.",
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
      user,
    });
  } catch (error) {
    return next(error);
  }
}

export function getCurrentUser(req, res) {
  return res.status(200).json({ user: req.user });
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
      user: req.user,
    });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({
        message: "Another account already uses this email address.",
      });
    }
    return next(error);
  }
}
