import DOMPurify from 'dompurify';

/**
 * Sanitizes AI-generated or user-supplied text before rendering in the UI
 * to neutralize any XSS payloads while keeping plain technical text intact.
 */
export function sanitizeOutput(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const stripped = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return stripped
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

