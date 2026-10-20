import express from "express";
import multer from "multer";

import {
  searchMedicines,
  getMedicineById,
  extractMedicines,
  extractFileMedicines,
  aiLookupMedicine,
  askMedicineQuestion,
} from "../controllers/medicineController.js";
import {
  aiLookupRateLimiter,
  extractFileRateLimiter,
  medicineChatRateLimiter,
} from "../middleware/rateLimiters.js";

const router = express.Router();

// Memory-storage multer — files stay in req.file.buffer and never touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max upload
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      return cb(null, true);
    }
    cb(new Error("Only PDF files are accepted."));
  },
});

router.get("/", searchMedicines);
router.post("/extract", extractMedicines);
router.post(
  "/extract-file",
  extractFileRateLimiter,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "File is too large. Maximum PDF size is 10 MB."
            : err.message || "Could not process uploaded file.";
        return res.status(status).json({ error: message });
      }
      next();
    });
  },
  extractFileMedicines
);
router.post("/ai-lookup", aiLookupRateLimiter, aiLookupMedicine);
router.post("/ask", medicineChatRateLimiter, askMedicineQuestion);
router.get("/:id", getMedicineById);

export default router;
