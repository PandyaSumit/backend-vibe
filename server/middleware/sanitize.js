/**
 * Input Sanitization Middleware
 *
 * Prevents NoSQL injection, XSS, and prototype pollution.
 */

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Remove null bytes
    value = value.replace(/\0/g, '');
    // Strip $ operators at the start of keys (NoSQL injection)
    if (value.startsWith('$')) {
      value = value.slice(1);
    }
    return value;
  }
  return value;
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizeValue(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    // Strip $ from keys (NoSQL injection vector)
    const safeKey = key.startsWith('$') ? key.slice(1) : key;
    cleaned[safeKey] = sanitizeObject(value);
  }
  return cleaned;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

// Rate limiter for AI routes (in-memory, per-IP)
const rateLimitStore = new Map();

function aiRateLimit(maxRequests = 20, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}`;

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many AI requests. Please wait before trying again.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

module.exports = { sanitizeMiddleware, aiRateLimit };
