import mongoose from "mongoose";

/**
 * Medicine model - maps onto the collection seeded from `medicines_cleaned.json`.
 *
 * The seeded data is not perfectly uniform (prices and flags may be numbers or
 * strings, list fields may be arrays or delimited strings), so the schema is
 * permissive and the controller normalises every document before it is sent to
 * the client. Reads use `.lean()`, so Mongoose never throws on a shape mismatch.
 *
 * Collection name: defaults to Mongoose's pluralised "medicines". Override with
 * MEDICINE_COLLECTION in the root .env if your seed used a different name.
 */
const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    composition1: { type: String, trim: true },
    composition2: { type: String, trim: true },
    price: mongoose.Schema.Types.Mixed,
    manufacturer: { type: String, trim: true },
    isDiscontinued: mongoose.Schema.Types.Mixed,
    sideEffects: mongoose.Schema.Types.Mixed,
    uses: mongoose.Schema.Types.Mixed,
    substitutes: mongoose.Schema.Types.Mixed,
    therapeuticClass: { type: String, trim: true },
    actionClass: { type: String, trim: true },
    chemicalClass: { type: String, trim: true },
    habitForming: { type: String, trim: true },
  },
  {
    strict: false,
    versionKey: false,
    collection: process.env.MEDICINE_COLLECTION?.trim() || "medicines",
  }
);

medicineSchema.index({ name: 1 });
medicineSchema.index({ composition1: 1 });

const Medicine =
  mongoose.models.Medicine || mongoose.model("Medicine", medicineSchema);

export default Medicine;
