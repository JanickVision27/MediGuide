import { createChatCompletion } from "./groqClient.js";

// Exact system prompt required for prescription parsing. Do not reword.
export const EXTRACTION_SYSTEM_PROMPT =
  "You are a medical text parser. Read the following text and extract ONLY the medicine or drug names mentioned. Return them as a JSON array of strings. Example: ['Dolo 650', 'Pan 40']. If no medicines are found, return an empty array []. Do not add any extra text, markdown, or explanation.";

const MAX_NAMES = 30;
const MAX_NAME_LENGTH = 100;

/**
 * Parse the model output into a clean array of medicine-name strings.
 * Tolerates code fences and single-quoted arrays (the prompt's example uses
 * single quotes). Throws if no array can be recovered.
 */
export function parseMedicineArray(raw) {
  let content = String(raw ?? "").trim();
  content = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw Object.assign(new Error("AI response did not contain a JSON array"), {
      code: "AI_PARSE_FAILED",
    });
  }
  const slice = content.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(slice);
  } catch {
    try {
      parsed = JSON.parse(slice.replace(/'/g, '"'));
    } catch {
      throw Object.assign(new Error("AI response was not valid JSON"), {
        code: "AI_PARSE_FAILED",
      });
    }
  }

  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error("AI response was not an array"), {
      code: "AI_PARSE_FAILED",
    });
  }

  const seen = new Set();
  const names = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const name = item.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= MAX_NAMES) break;
  }
  return names;
}

/**
 * Ask Groq to extract medicine names from free text.
 * Throws with `code` set to AI_NOT_CONFIGURED, AI_REQUEST_FAILED or AI_PARSE_FAILED.
 */
export async function extractMedicineNames(text) {
  // Use the shared Groq client so model selection (GROQ_AI_LOOKUP_MODEL,
  // default openai/gpt-oss-120b) and API-key lookup are consistent with the
  // rest of the MediGuide AI features.
  let content;
  try {
    content = await createChatCompletion({
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
      maxTokens: 1024,
    });
  } catch (error) {
    // createChatCompletion already throws typed errors (AI_NOT_CONFIGURED,
    // AI_REQUEST_FAILED, AI_EMPTY_RESPONSE). Re-throw with an extraction-
    // specific message when needed.
    if (error.code === "AI_NOT_CONFIGURED") throw error;
    console.error("Groq extraction error:", error.apiMessage || error.message);
    throw Object.assign(new Error("AI extraction request failed"), {
      code: "AI_REQUEST_FAILED",
    });
  }

  return parseMedicineArray(content);
}
