import { z } from "zod";

import {
  createChatCompletion,
  getAiLookupModel,
} from "./groqClient.js";
import {
  aiLookupCacheKey,
  getCachedMedicineInfo,
  setCachedMedicineInfo,
} from "./aiLookupCache.js";
import { stripMarkdownInline } from "./plainText.js";

export const DEFAULT_DISCLAIMER =
  "AI-generated information. Consult a licensed healthcare professional before taking any medication.";

/** Every key the ai-lookup endpoint guarantees in its response. */
export const MEDICINE_INFO_FIELDS = [
  "name",
  "genericName",
  "category",
  "uses",
  "dosageForms",
  "commonSideEffects",
  "warnings",
  "interactions",
  "disclaimer",
];

const STRING_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };

/**
 * Strict-mode JSON schema sent to Groq as `response_format`.
 *
 * Strict mode requires `additionalProperties: false` on every object and every
 * property listed in `required` - optional fields are not allowed.
 */
export const MEDICINE_INFO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      description: "The medicine name as commonly written.",
    },
    genericName: {
      type: "string",
      description: "Generic / molecule name, or an empty string if unknown.",
    },
    category: {
      type: "string",
      description:
        "Therapeutic category, e.g. NSAID, antibiotic, proton pump inhibitor.",
    },
    uses: {
      ...STRING_ARRAY_SCHEMA,
      description: "Common, general uses of the medicine.",
    },
    dosageForms: {
      ...STRING_ARRAY_SCHEMA,
      description: "Available forms, e.g. tablet, syrup, injection.",
    },
    commonSideEffects: {
      ...STRING_ARRAY_SCHEMA,
      description: "Common side effects in general terms.",
    },
    warnings: {
      ...STRING_ARRAY_SCHEMA,
      description: "General precautions and warnings.",
    },
    interactions: {
      ...STRING_ARRAY_SCHEMA,
      description: "Notable drug or food interactions.",
    },
    disclaimer: {
      type: "string",
      description: "A short safety disclaimer for the reader.",
    },
  },
  required: [...MEDICINE_INFO_FIELDS],
};

export const AI_LOOKUP_SYSTEM_PROMPT = `You are a medicine information assistant for an educational demo.
Provide factual, publicly available general information only. Never diagnose, prescribe, or recommend patient-specific dosages, tapers, or substitutions.
Return exactly one JSON object matching this shape and no markdown, code fences, or prose:
{"name":"string","genericName":"string","category":"string","uses":["string"],"dosageForms":["string"],"commonSideEffects":["string"],"warnings":["string"],"interactions":["string"],"disclaimer":"string"}
Use an empty string or an empty array when a value is unknown. Never use null.
If you have no reliable information about the medicine, return the same object with empty values instead of inventing details.
The disclaimer must remind the reader that this is AI-generated information and that they should consult a licensed healthcare professional.`;

const MAX_ITEM_LENGTH = 300;

const listSchema = (max) => z.array(z.string().max(MAX_ITEM_LENGTH)).max(max);

const medicineInfoSchema = z.object({
  name: z.string().max(150),
  genericName: z.string().max(200),
  category: z.string().max(150),
  uses: listSchema(15),
  dosageForms: listSchema(10),
  commonSideEffects: listSchema(20),
  warnings: listSchema(15),
  interactions: listSchema(15),
  disclaimer: z.string().max(500),
});

/**
 * Sanitize a model-provided string into one plain-text line (never null) and
 * strip any markdown the model put inside the JSON value.
 */
function toText(value) {
  if (typeof value !== "string") return "";
  return stripMarkdownInline(value, MAX_ITEM_LENGTH);
}

/** Keep only non-empty unique strings, capped at `max` items. */
function toList(value, max) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const text = toText(item);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Strip code fences, then JSON.parse inside try/catch.
 * Returns the parsed object, or null when the model did not return JSON.
 */
export function parseJsonObject(raw) {
  let content = String(raw ?? "").trim();
  content = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(content.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Coerce the model output into the exact public shape.
 * Unknown / mistyped values become empty strings or arrays (never null).
 */
export function normalizeMedicineInfo(raw, requestedName) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const data = {
    name: toText(raw.name).slice(0, 150),
    genericName: toText(raw.genericName).slice(0, 200),
    category: toText(raw.category).slice(0, 150),
    uses: toList(raw.uses, 15),
    dosageForms: toList(raw.dosageForms, 10),
    commonSideEffects: toList(raw.commonSideEffects, 20),
    warnings: toList(raw.warnings, 15),
    interactions: toList(raw.interactions, 15),
    disclaimer: toText(raw.disclaimer).slice(0, 500),
  };

  // Fall back to the requested name if the model left it blank.
  if (!data.name) data.name = String(requestedName ?? "").trim().slice(0, 150);
  if (!data.disclaimer) data.disclaimer = DEFAULT_DISCLAIMER;

  const validated = medicineInfoSchema.safeParse(data);
  return validated.success ? validated.data : null;
}

/** True when the model actually supplied any medicine information. */
export function hasMedicineInformation(data) {
  if (!data) return false;
  return Boolean(
    data.genericName ||
      data.category ||
      data.uses?.length ||
      data.dosageForms?.length ||
      data.commonSideEffects?.length ||
      data.warnings?.length ||
      data.interactions?.length
  );
}

function lookupError(message, code) {
  return Object.assign(new Error(message), { code });
}

/**
 * Ask Groq for structured information about a medicine.
 *
 * Primary request uses strict Structured Outputs (`json_schema`). If the model
 * rejects that with a 400, we retry once with `json_object` and the schema
 * stated in the system prompt - never prose.
 *
 * Resolves with `{ data, cached }` where `data` always contains every key in
 * MEDICINE_INFO_FIELDS. Throws with `code`:
 *   AI_NOT_CONFIGURED / AI_REQUEST_FAILED / AI_PARSE_FAILED / NOT_FOUND
 */
export async function lookupMedicineWithAI(medicineName) {
  const cacheKey = aiLookupCacheKey(medicineName);
  const cached = getCachedMedicineInfo(cacheKey);
  if (cached) {
    console.log("AI lookup cache hit:", cacheKey);
    return { data: cached, cached: true };
  }

  const messages = [
    { role: "system", content: AI_LOOKUP_SYSTEM_PROMPT },
    { role: "user", content: `Medicine: ${medicineName}` },
  ];
  const baseRequest = {
    model: getAiLookupModel(),
    messages,
    temperature: 0.2,
    maxCompletionTokens: 900,
    timeoutMs: 15000,
  };

  let content;
  try {
    content = await createChatCompletion({
      ...baseRequest,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "medicine_info",
          strict: true,
          schema: MEDICINE_INFO_JSON_SCHEMA,
        },
      },
    });
  } catch (error) {
    // 400 usually means the configured model does not support json_schema.
    if (error.code === "AI_REQUEST_FAILED" && error.status === 400) {
      console.warn(
        "Groq rejected json_schema; retrying with json_object:",
        error.apiMessage || "(no message)"
      );
      try {
        content = await createChatCompletion({
          ...baseRequest,
          responseFormat: { type: "json_object" },
        });
      } catch (retryError) {
        console.error(
          "Groq AI lookup retry error:",
          retryError.status,
          retryError.apiMessage || retryError.message
        );
        throw retryError;
      }
    } else {
      console.error(
        "Groq AI lookup error:",
        error.status,
        error.apiMessage || error.message
      );
      throw error;
    }
  }

  const parsed = parseJsonObject(content);
  if (!parsed) {
    throw lookupError("AI response was not valid JSON", "AI_PARSE_FAILED");
  }
  if (parsed.error === "not_found") {
    throw lookupError("No reliable information returned", "NOT_FOUND");
  }

  const data = normalizeMedicineInfo(parsed, medicineName);
  if (!data) {
    throw lookupError(
      "AI response did not match the medicine schema",
      "AI_PARSE_FAILED"
    );
  }
  if (!hasMedicineInformation(data)) {
    throw lookupError("No reliable information returned", "NOT_FOUND");
  }

  setCachedMedicineInfo(cacheKey, data);
  return { data, cached: false };
}
