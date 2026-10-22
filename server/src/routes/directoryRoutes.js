import express from "express";

import {
  getDoctors,
  searchHospitals,
} from "../controllers/directoryController.js";

export const hospitalRouter = express.Router();
export const doctorRouter = express.Router();

hospitalRouter.get("/search", searchHospitals);
doctorRouter.get("/", getDoctors);
