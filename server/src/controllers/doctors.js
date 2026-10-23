import mongoose from "mongoose";

import { demoDoctors } from "../data/directory.js";
import Doctor from "../models/Doctor.js";
import { containsRegex, normalizeFilter } from "../utils/directoryFilters.js";

/** Insert or update stable demo records without creating duplicates on restart. */
export async function seedDemoDoctors() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB must be connected before seeding doctors.");
  }

  await Doctor.bulkWrite(
    demoDoctors.map((doctor) => ({
      updateOne: {
        filter: { slug: doctor.id },
        update: {
          $set: {
            name: doctor.name,
            specialty: doctor.specialty,
            location: doctor.location,
            active: true,
          },
          $setOnInsert: { slug: doctor.id, isDemo: true },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return demoDoctors.length;
}

export async function getDoctors(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "The doctor directory is temporarily unavailable.",
    });
  }

  const name = normalizeFilter(req.query.name, 100);
  const specialty = normalizeFilter(req.query.specialty, 100);
  const location = normalizeFilter(req.query.location, 100);
  if (name === null || specialty === null || location === null) {
    return res.status(400).json({ message: "Invalid doctor search filters." });
  }

  const filter = { active: true };
  if (name) filter.name = containsRegex(name);
  if (specialty) filter.specialty = containsRegex(specialty);
  if (location) filter.location = containsRegex(location);

  try {
    const records = await Doctor.find(filter)
      .sort({ name: 1, specialty: 1 })
      .limit(100)
      .lean();
    const doctors = records.map((doctor) => ({
      id: doctor._id.toString(),
      name: doctor.name,
      specialty: doctor.specialty,
      location: doctor.location || "",
    }));

    return res.status(200).json({
      doctors,
      count: doctors.length,
      source: "synthetic-demo-directory",
    });
  } catch (error) {
    return next(error);
  }
}
