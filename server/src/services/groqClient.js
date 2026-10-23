import axios from "axios";

/**
 * Shared Groq client helpers.
 *
 * Every MediGuide AI feature talks to the same OpenAI-compatible endpoint, so
 * the URL, key lookup and model selection live here. Callers get a plain string
 * of model output and typed errors they can map onto HTTP responses:
 *
 *   AI_NOT_CONFIGURED - no Groq API key is present
 *   AI_REQUEST_FAILED - network error, timeout, or a non-2xx Groq response
 *   AI_EMPTY_RESPONSE - Groq answered with an empty message
 *
 * `error.status`, `error.apiMessage` and `error.apiCode` expose the upstream
 * details for logging and for the json_schema -> json_object fallback.
 */
export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const DEFAULT_AI_MODEL = "openai/gpt-oss-120b";

const DEFAULT_TIMEOUT_MS = 20000;

/** Key names kept for backwards compatibility with the existing services. */
export function getGroqApiKey() {
  return (
    process.env.GROQ_API ||
    process.env.AI_API_KEY ||
    process.env.GROQ_API_KEY ||
    ""
  ).trim();
}

/** Ai-lookup and medicine-chat share one model override. */
export function getAiLookupModel() {
  return process.env.GROQ_AI_LOOKUP_MODEL?.trim() || DEFAULT_AI_MODEL;
}

function aiError(message, code, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

/**
 * POST a chat-completion request to Groq and return the assistant text.
 *
 * @param {object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {number} [options.maxCompletionTokens] maps to max_completion_tokens
 * @param {number} [options.maxTokens] maps to legacy max_tokens
 * @param {object} [options.responseFormat] maps to response_format
 * @param {number} [options.timeoutMs]
 * @returns {Promise<string>}
 */
export async function createChatCompletion({
  messages,
  model,
  temperature = 0.3,
  maxCompletionTokens,
  maxTokens,
  responseFormat,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw aiError("AI API key is not configured", "AI_NOT_CONFIGURED");
  }

  const payload = {
    model: model || getAiLookupModel(),
    messages,
    temperature,
  };
  if (Number.isFinite(maxCompletionTokens)) {
    payload.max_completion_tokens = maxCompletionTokens;
  }
  if (Number.isFinite(maxTokens)) {
    payload.max_tokens = maxTokens;
  }
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  let data;
  try {
    const response = await axios.post(GROQ_URL, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: timeoutMs,
    });
    data = response.data;
  } catch (error) {
    throw aiError("AI request failed", "AI_REQUEST_FAILED", {
      status: error.response?.status,
      apiMessage: error.response?.data?.error?.message,
      apiCode: error.response?.data?.error?.code,
    });
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw aiError("AI returned an empty response", "AI_EMPTY_RESPONSE");
  }
  return content;
}
