const path = require('path');

/**
 * Validates that a filename does not contain path traversal sequences.
 */
function isValidFilename(filename) {
  const normalized = path.normalize(filename);
  if (
    normalized.includes('..') ||
    normalized.includes('/') ||
    normalized.includes('\\') ||
    filename !== path.basename(filename)
  ) {
    return false;
  }
  return true;
}

/**
 * Validates that a filename param does not contain path traversal sequences.
 * Returns a middleware that checks the specified route param.
 */
function sanitizeFilename(paramName = 'fileName') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    if (!raw) return next();

    if (!isValidFilename(raw)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    next();
  };
}

module.exports = { sanitizeFilename, isValidFilename };
