import express from "express";

import {
  searchMedicines,
  getMedicineById,
  extractMedicines,
} from "../controllers/medicineController.js";

const router = express.Router();

router.get("/", searchMedicines);
router.post("/extract", extractMedicines);
router.get("/:id", getMedicineById);

export default router;
