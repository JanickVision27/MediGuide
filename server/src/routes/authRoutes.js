import express from "express";

import {
  getCurrentUser,
  login,
  logout,
  register,
  updateProfile,
} from "../controllers/authController.js";
import requireAuth from "../middleware/requireAuth.js";
import { authRateLimiter } from "../middleware/rateLimiters.js";
import {
  loginSchema,
  profileSchema,
  registerSchema,
  validateBody,
} from "../validators/authValidator.js";

const router = express.Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
router.patch(
  "/profile",
  requireAuth,
  validateBody(profileSchema),
  updateProfile
);

export default router;
