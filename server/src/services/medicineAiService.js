import axios from "axios";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const getModel = () =>
  process.env.GROQ_AI_LOOKUP_MODEL?.trim() || "openai/gpt-oss-120b";
const TIMEOUT_MS = 15000;
const DEFAULT_DISCLAIMER =
  "AI-generated information. Consult a licensed healthcare professional before taking any medication.";

export const AI_LOOKUP_SYSTEM_PROMPT = `You are a medicine information assistant. Provide factual, publicly available information only.
Never diagnose, prescribe, or recommend specific dosages.
Always include a safety disclaimer: consult a licensed healthcare professional before taking any medication.
Return exactly one JSON object and no markdown, code fences, or prose. Include every property with these types:
{ "name": "string", "genericName": "string", "uses": ["string"], "sideEffects": ["string"], "precautions": ["string"], "therapeuticClass": "string", "isOTC": false, "disclaimer": "string" }
Use empty strings and empty arrays for unknown details. Set isOTC to true only when reliable information supports it; otherwise use false.
If you don't have reliable information about this medicine, return { "error": "not_found" }`;

const medicineInfoSchema = z.object({
  name: z.string().trim().min(1).max(150),
  genericName: z.string().trim().max(200).default(""),
  uses: z.array(z.string().trim().min(1).max(300)).max(15).default([]),
  sideEffects: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  precautions: z.array(z.string().trim().min(1).max(300)).max(15).default([]),
  therapeuticClass: z.string().trim().max(150).default(""),
  isOTC: z.boolean().default(false),
  disclaimer: z.string().trim().max(500).default(DEFAULT_DISCLAIMER),
});

/** Strip code fences and extract the JSON object from the model output. */
function parseJsonObject(raw) {
  const content = String(raw ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Recover the expected list fields if a model ever ignores JSON mode. */
function parseMarkdownFallback(raw, medicineName) {
  const sections = {
    uses: /^(?:typical\s+)?uses?\s*:?$/i,
    sideEffects: /^(?:common\s+)?side effects?\s*:?$/i,
    precautions: /^(?:important\s+)?precautions?\s*:?$/i,
  };
  const lists = { uses: [], sideEffects: [], precautions: [] };
  let activeList = null;

  for (const rawLine of String(raw ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.replace(/^#+\s*/, "").replace(/^\*\*(.*?)\*\*:?$/, "$1").trim();
    const section = Object.entries(sections).find(([, pattern]) => pattern.test(heading));
    if (section) {
      activeList = section[0];
      continue;
    }
    if (!line) continue;

    const bullet = line.match(/^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/);
    if (activeList && bullet) {
      const item = bullet[1].replace(/\*\*/g, "").trim();
      if (item) lists[activeList].push(item);
    } else if (!/^\*\*/.test(line) && !/^#+/.test(line)) {
      activeList = null;
    }
  }

  if (!lists.uses.length && !lists.sideEffects.length && !lists.precautions.length) {
    return null;
  }

  return {
    name: medicineName,
    genericName: "",
    ...lists,
    therapeuticClass: "",
    isOTC: false,
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

/**
 * Ask Groq for structured information about a medicine.
 * Resolves with a validated medicine-info object.
 * Rejects with `code`:
 *   AI_NOT_CONFIGURED - no API key set
 *   AI_REQUEST_FAILED - network error, timeout, or Groq error (e.g. rate limit)
 *   NOT_FOUND         - model reported not_found or returned an invalid shape
 */
export async function lookupMedicineWithAI(medicineName) {
  const apiKey =
    process.env.GROQ_API || process.env.AI_API_KEY || process.env.GROQ_API_KEY;
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
        // Read at request time so dotenv has already loaded in the app entry point.
        model: getModel(),
        messages: [
          { role: "system", content: AI_LOOKUP_SYSTEM_PROMPT },
          { role: "user", content: `Medicine: ${medicineName}` },
        ],
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: TIMEOUT_MS,
      }
    );
    content = response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    console.error(
      "Groq AI lookup error:",
      error.response?.status,
      error.response?.data?.error?.message || error.message
    );
    throw Object.assign(new Error("AI lookup request failed"), {
      code: "AI_REQUEST_FAILED",
    });
  }

  const parsed = parseJsonObject(content) || parseMarkdownFallback(content, medicineName);
  if (!parsed || parsed.error === "not_found") {
    throw Object.assign(new Error("No reliable information returned"), {
      code: "NOT_FOUND",
    });
  }

  const result = medicineInfoSchema.safeParse(parsed);
  if (!result.success) {
    console.error("AI lookup returned invalid shape:", result.error.issues[0]?.message);
    throw Object.assign(new Error("AI response had an invalid shape"), {
      code: "NOT_FOUND",
    });
  }

  return result.data;
}
