/**
 * Sanitizes plain-text fields extracted from user resumes or AI outputs
 * to prevent XSS payloads from being stored or rendered.
 * Preserves legitimate technical notation (e.g., "C++", "React < 18").
 */
function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    // Remove null bytes and dangerous control characters while keeping tabs/newlines
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Strip script/style blocks completely including inner content
    .replace(/<(script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip remaining HTML/XML tags while preserving standalone comparisons like "React < 18"
    .replace(/<\/?[a-zA-Z!][a-zA-Z0-9:-]*(?:\s[^>]*)?\/?>/g, '')
    // Neutralize scriptable URI schemes
    .replace(/\b(javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    .trim();
}

module.exports = {
  sanitizeText,
};

