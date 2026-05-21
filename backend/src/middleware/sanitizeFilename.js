const path = require('path');

/**
 * Validates that a filename param does not contain path traversal sequences.
 * Returns a middleware that checks the specified route param.
 */
function sanitizeFilename(paramName = 'fileName') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    if (!raw) return next();

    // Reject path separators and traversal patterns
    const normalized = path.normalize(raw);
    if (
      normalized.includes('..') ||
      normalized.includes('/') ||
      normalized.includes('\\') ||
      raw !== path.basename(raw)
    ) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    next();
  };
}

module.exports = { sanitizeFilename };
