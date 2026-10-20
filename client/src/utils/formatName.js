/**
 * Formatting helpers for display names.
 * - formatMedicineName: capitalize each word, preserve hyphens and slashes, keep numbers, uppercase abbreviations.
 * - formatClassName: title case, preserve acronyms NSAIDS, GERD, OTC.
 */

const MEDICINE_ABBREVIATIONS = new Set(['MG', 'ML', 'SP', 'LS', 'CZ', 'TH', 'AA']);
const CLASS_ACRONYMS = new Set(['NSAIDS', 'GERD', 'OTC']);

export function formatMedicineName(name) {
  if (name == null || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  // Collapse consecutive whitespace to single space, split into words
  const words = trimmed.split(/\s+/);
  const formatted = words.map(formatMedicineToken);
  return formatted.join(' ');
}

function formatMedicineToken(token) {
  if (!token) return token;
  // Preserve slashes: e.g., 100mg/325mg
  if (token.includes('/')) {
    return token.split('/').map((part) => formatMedicineToken(part)).join('/');
  }
  // Preserve hyphens: e.g., A-Plus
  if (token.includes('-')) {
    // Handle edge where token is just "-" or starts/ends with "-"
    return token.split('-').map((part) => formatMedicineToken(part)).join('-');
  }

  const upper = token.toUpperCase();
  if (MEDICINE_ABBREVIATIONS.has(upper)) {
    return upper;
  }

  if (!token) return token;
  // Capitalize first character, lowercase the rest.
  // If token starts with a digit (e.g., 120mg, 625), first char is digit,
  // toUpperCase does nothing, rest lowercased preserves correct form.
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export function formatClassName(name) {
  if (name == null || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  return words.map(formatClassToken).join(' ');
}

function formatClassToken(token) {
  if (!token) return token;
  if (token.includes('/')) {
    return token.split('/').map((p) => formatClassToken(p)).join('/');
  }
  if (token.includes('-')) {
    return token.split('-').map((p) => formatClassToken(p)).join('-');
  }

  // Extract core alphabetic part to check acronym, preserving surrounding punctuation
  // e.g., "(NSAIDS)" -> core "NSAIDS", "(second" -> core "second"
  // We handle tokens that may have leading/trailing non-letters
  const match = token.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
  if (match) {
    const [, prefix, core, suffix] = match;
    const upperCore = core.toUpperCase();
    if (CLASS_ACRONYMS.has(upperCore)) {
      return `${prefix}${upperCore}${suffix}`;
    }
    // For generic word with punctuation, title-case core
    const titledCore = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
    return `${prefix}${titledCore}${suffix}`;
  }

  // Fallback: check whole token uppercase is acronym (covers tokens like "NSAIDS")
  const upper = token.toUpperCase();
  if (CLASS_ACRONYMS.has(upper)) return upper;

  // Generic title case for tokens with numbers/mixed: e.g., "1&2" or "COX"
  // If token contains letters, title case first letter; otherwise return as is.
  // Find first letter index
  const firstLetterIdx = token.search(/[A-Za-z]/);
  if (firstLetterIdx === -1) return token;
  const before = token.slice(0, firstLetterIdx);
  const letter = token.charAt(firstLetterIdx).toUpperCase();
  const after = token.slice(firstLetterIdx + 1).toLowerCase();
  return before + letter + after;
}
