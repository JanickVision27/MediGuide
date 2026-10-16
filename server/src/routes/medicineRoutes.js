import express from "express";

import {
  searchMedicines,
  getMedicineById,
  extractMedicines,
  aiLookupMedicine,
} from "../controllers/medicineController.js";
import { aiLookupRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/", searchMedicines);
router.post("/extract", extractMedicines);
router.post("/ai-lookup", aiLookupRateLimiter, aiLookupMedicine);
router.get("/:id", getMedicineById);

export default router;
