/**
 * Plain-text sanitizer.
 *
 * The UI has no markdown renderer, so model output must never carry markdown
 * markers. Structured Outputs already constrain the JSON shape; this removes
 * any markdown the model puts *inside* a string value as well.
 */
export const MAX_PLAIN_TEXT_LENGTH = 4000;

/**
 * Convert markdown-ish model output into plain text.
 * Keeps the words, drops the syntax (fences, headings, emphasis, links,
 * blockquotes, bullet markers and simple HTML tags).
 */
export function stripMarkdown(raw, maxLength = MAX_PLAIN_TEXT_LENGTH) {
  let text = String(raw ?? "").replace(/\r\n?/g, "\n");

  // Code fences, inline code, headings, blockquotes.
  text = text.replace(/```[a-z0-9]*\n?/gi, "");
  text = text.replace(/`([^`\n]*)`/g, "$1");
  text = text.replace(/`+/g, "");
  text = text.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  // Markdown links [label](url) -> label (url)
  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1 ($2)");

  // Bold / italic emphasis - keep the words, drop the markers.
  text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  text = text.replace(/__([^_\n]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<![\p{L}\p{N}])_([^_\n]+)_(?![\p{L}\p{N}])/gu, "$1");

  // Leading bullet symbols; the line content is preserved.
  text = text.replace(/^\s*[-*+•]\s+/gm, "");

  // Stray emphasis characters and simple HTML tags.
  text = text.replace(/[*]+/g, "");
  text = text.replace(/<\/?[a-z][^>]*>/gi, "");

  // Tidy blank lines and trailing spaces.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, maxLength).trim();
}

/** Sanitize one schema string field into a single clean line. */
export function stripMarkdownInline(raw, maxLength) {
  return stripMarkdown(raw, maxLength).replace(/\s+/g, " ").trim();
}
