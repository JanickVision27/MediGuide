import { z } from "zod";

/**
 * Patterns that look like script injection or SQL injection.
 * Defence in depth only: the name is sent to Groq as a JSON string and never
 * reaches a database query, but rejecting these shapes early keeps the
 * endpoint from being used to push markup or SQL-like payloads around.
 */
const BLOCKED_PATTERNS = [
  /<\s*\/?\s*script\b/i,
  /javascript\s*:/i,
  /\bunion\s+(all\s+)?select\b/i,
  /\bselect\b[\s\S]*\bfrom\b/i,
  /\b(drop|truncate|alter)\s+(table|database)\b/i,
  /;\s*(drop|delete|insert|update|select|exec)\b/i,
  /--|\/\*|\*\//,
  /'\s*(or|and)\s*['"\d]/i,
];

// Letters, digits, spaces and common medicine-name punctuation only.
const ALLOWED_CHARACTERS = /^[\p{L}\p{N}\s\-.()'/+%,]+$/u;

/**
 * Shared medicine-name field. Used by ai-lookup and by per-medicine chat so
 * both endpoints accept exactly the same input.
 */
export const medicineNameSchema = z
  .string({ error: "medicineName must be a string" })
  .trim()
  .min(1, "Medicine name is required")
  .max(100, "Medicine name must be 100 characters or fewer")
  .refine((value) => ALLOWED_CHARACTERS.test(value), {
    message: "Medicine name contains unsupported characters",
  })
  .refine((value) => !BLOCKED_PATTERNS.some((pattern) => pattern.test(value)), {
    message: "Medicine name contains disallowed content",
  });

export const aiLookupSchema = z.object({
  medicineName: medicineNameSchema,
});
