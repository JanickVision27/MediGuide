import express from "express";

import { searchHospitals } from "../controllers/hospitals.js";

const router = express.Router();

router.get("/search", searchHospitals);

export default router;
