import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/user.js";
import {
  clearSession,
  SESSION_COOKIE,
  verifySession,
} from "../utils/session.js";

function rejectSession(res, message = "Please sign in to continue.") {
  clearSession(res);
  return res.status(401).json({ message });
}

export default async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return rejectSession(res);

  let payload;
  try {
    payload = verifySession(token);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return rejectSession(res, "Your session has expired. Please sign in again.");
    }
    return next(error);
  }

  if (!payload?.sub || !mongoose.isValidObjectId(payload.sub)) {
    return rejectSession(res);
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) return rejectSession(res);

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    return next(error);
  }
}
