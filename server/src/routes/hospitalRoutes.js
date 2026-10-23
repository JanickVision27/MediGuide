import express from "express";
import rateLimit from "express-rate-limit";

import {
  getGoogleHospitalPhoto,
  searchHospitals,
} from "../controllers/hospitals.js";

const router = express.Router();
const hospitalSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many hospital searches. Please wait a minute and try again.",
  },
});
const hospitalPhotoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many photo requests. Please wait a moment and try again.",
  },
});

router.get("/search", hospitalSearchLimiter, searchHospitals);
router.get("/photo", hospitalPhotoLimiter, getGoogleHospitalPhoto);

export default router;
