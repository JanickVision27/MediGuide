import mongoose from "mongoose";

import Medicine from "../models/medicine.js";
import { extractMedicineNames } from "../services/medicineExtractionService.js";

const SEARCH_LIMIT = 50;
const CANDIDATE_LIMIT = 500;
const MAX_SEARCH_LENGTH = 100;
const MAX_PRESCRIPTION_LENGTH = 5000;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const DB_UNAVAILABLE_MESSAGE =
  "Medicine database is currently unavailable. Please try again later.";

const dbReady = () => mongoose.connection.readyState === 1;

// ---------- helpers ---------------------------------------------------------

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Normalise whitespace and case for comparisons.
const normalise = (value) =>
  String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// "Dolo 650" -> /Dolo\s+650/ so extra spaces in either side still match.
const phrasePattern = (value) =>
  value
    .trim()
    .split(/\s+/)
    .map(escapeRegex)
    .join("\\s+");

// Matches the phrase at the start of a string, not followed by another letter.
// "Dolo 650" matches "Dolo 650 Tablet" but not "Dolo 6500".
const prefixRegex = (value) =>
  new RegExp(`^${phrasePattern(value)}(?![a-z])`, "i");

// Matches the phrase as a whole word anywhere (used for composition fields).
const wordRegex = (value) =>
  new RegExp(`\\b${phrasePattern(value)}\\b`, "i");

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// List fields may be arrays or delimited strings in the seeded data.
function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return /^(true|yes|1|y)$/i.test(value.trim());
  return false;
}

/** Shape a raw Mongo document into the public Medicine object. */
export function serializeMedicine(doc) {
  const price = doc.price;
  return {
    _id: String(doc._id),
    name: toText(doc.name),
    composition1: toText(doc.composition1),
    composition2: toText(doc.composition2),
    price: price === null || price === undefined || price === "" ? null : toText(price),
    manufacturer: toText(doc.manufacturer),
    isDiscontinued: toBoolean(doc.isDiscontinued),
    sideEffects: toStringArray(doc.sideEffects),
    uses: toStringArray(doc.uses),
    substitutes: toStringArray(doc.substitutes),
    therapeuticClass: toText(doc.therapeuticClass),
    actionClass: toText(doc.actionClass),
    chemicalClass: toText(doc.chemicalClass),
    habitForming: toText(doc.habitForming),
  };
}

/**
 * Match each AI-extracted name against the candidate documents.
 * Tiers (best first):
 *   1. name equals the extracted name (case-insensitive)
 *   2. name starts with the extracted name ("Dolo 650" -> "Dolo 650 Tablet")
 *   3. composition1 contains the extracted name as a whole word
 * Within a tier the shortest name wins, so the closest product is chosen.
 *
 * Returns { found: Medicine documents, notFound: names with no match }.
 */
export function splitMedicines(names, docs) {
  const found = [];
  const foundIds = new Set();
  const notFound = [];

  for (const name of names) {
    const target = normalise(name);
    const prefix = prefixRegex(name);
    const word = wordRegex(name);

    let best = null;
    let bestTier = Infinity;

    for (const doc of docs) {
      const docName = toText(doc.name);
      const composition = toText(doc.composition1);

      let tier = Infinity;
      if (normalise(docName) === target) tier = 1;
      else if (prefix.test(docName)) tier = 2;
      else if (word.test(composition)) tier = 3;

      if (tier === Infinity) continue;

      const isBetter =
        tier < bestTier ||
        (tier === bestTier && docName.length < toText(best?.name).length);

      if (isBetter) {
        best = doc;
        bestTier = tier;
      }
    }

    if (best) {
      const id = String(best._id);
      if (!foundIds.has(id)) {
        foundIds.add(id);
        found.push(best);
      }
    } else {
      notFound.push(name);
    }
  }

  return { found, notFound };
}

// ---------- routes ----------------------------------------------------------

/** GET /api/medicines?search=query */
export async function searchMedicines(req, res) {
  if (!dbReady()) {
    return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
  }

  try {
    const raw = typeof req.query.search === "string" ? req.query.search : "";
    const term = raw.trim().slice(0, MAX_SEARCH_LENGTH);

    const filter = term
      ? {
          $or: [
            { name: new RegExp(escapeRegex(term), "i") },
            { composition1: new RegExp(escapeRegex(term), "i") },
          ],
        }
      : {};

    const docs = await Medicine.find(filter)
      .sort({ name: 1 })
      .limit(SEARCH_LIMIT)
      .lean();

    return res.json(docs.map(serializeMedicine));
  } catch (error) {
    console.error("Medicine search error:", error.message);
    return res.status(500).json({ error: "Failed to search medicines" });
  }
}

/** GET /api/medicines/:id */
export async function getMedicineById(req, res) {
  const { id } = req.params;

  if (!OBJECT_ID_PATTERN.test(id)) {
    return res.status(400).json({ error: "Invalid medicine id" });
  }
  if (!dbReady()) {
    return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
  }

  try {
    const doc = await Medicine.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    return res.json(serializeMedicine(doc));
  } catch (error) {
    console.error("Medicine lookup error:", error.message);
    return res.status(500).json({ error: "Failed to load medicine" });
  }
}

/**
 * POST /api/medicines/extract  { text }
 * -> { found: Medicine[], notFound: string[], dbAvailable: boolean }
 *
 * If MongoDB is down, the AI still runs and every extracted name goes into
 * `notFound` with dbAvailable=false, so the user still gets useful output.
 */
export async function extractMedicines(req, res) {
  const text = req.body?.text;

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Prescription text is required" });
  }
  if (text.length > MAX_PRESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: `Prescription text must be ${MAX_PRESCRIPTION_LENGTH} characters or fewer`,
    });
  }

  let names;
  try {
    names = await extractMedicineNames(text.trim());
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ error: "AI service is not configured on the server" });
    }
    return res.status(502).json({
      error: "Could not extract medicine names right now. Please try again.",
    });
  }

  if (names.length === 0) {
    return res.json({ found: [], notFound: [], dbAvailable: dbReady() });
  }

  if (!dbReady()) {
    return res.json({ found: [], notFound: names, dbAvailable: false });
  }

  try {
    const clauses = names.flatMap((name) => [
      { name: { $regex: prefixRegex(name).source, $options: "i" } },
      { composition1: { $regex: wordRegex(name).source, $options: "i" } },
    ]);

    const candidates = await Medicine.find({ $or: clauses })
      .limit(CANDIDATE_LIMIT)
      .lean();

    const { found, notFound } = splitMedicines(names, candidates);

    return res.json({
      found: found.map(serializeMedicine),
      notFound,
      dbAvailable: true,
    });
  } catch (error) {
    console.error("Medicine extract lookup error:", error.message);
    return res.json({ found: [], notFound: names, dbAvailable: false });
  }
}
