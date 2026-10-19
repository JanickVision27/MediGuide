import express from "express";

import {
  searchMedicines,
  getMedicineById,
  extractMedicines,
  aiLookupMedicine,
  askMedicineQuestion,
} from "../controllers/medicineController.js";
import {
  aiLookupRateLimiter,
  medicineChatRateLimiter,
} from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/", searchMedicines);
router.post("/extract", extractMedicines);
router.post("/ai-lookup", aiLookupRateLimiter, aiLookupMedicine);
router.post("/ask", medicineChatRateLimiter, askMedicineQuestion);
router.get("/:id", getMedicineById);

export default router;
