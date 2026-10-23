export function normalizeFilter(value, maxLength = 80) {
  if (value === undefined) return "";
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

export function containsRegex(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}
