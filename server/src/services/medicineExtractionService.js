import axios from "axios";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Same model the existing chatbot uses, overridable per environment.
const MODEL = process.env.GROQ_EXTRACT_MODEL?.trim() || "openai/gpt-oss-120b";

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
  const apiKey = process.env.GROQ_API || process.env.AI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("AI API key is not configured"), {
      code: "AI_NOT_CONFIGURED",
    });
  }

  let content;
  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );
    content = response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    console.error(
      "Groq extraction error:",
      error.response?.data?.error || error.message
    );
    throw Object.assign(new Error("AI extraction request failed"), {
      code: "AI_REQUEST_FAILED",
    });
  }

  return parseMedicineArray(content);
}
