/**
 * List of keys considered sensitive and to be redacted from logs.
 * Add any key names here that you don't want logged in plaintext.
 */
const SENSITIVE_KEYS = new Set([
  'authorization',
  'auth',
  'cookie',
  'cookies',
  'session',
  'token',
  'secret',
  'password',
  'passwd',
  'key',
  'apikey',
  'clientsecret',
  'signature',
  'privatekey',
  'credential',
  'credentials'
]);

/**
 * Patterns matching sensitive values for redaction.
 * Used to detect tokens, passwords, secrets, etc. in strings.
 */
const SENSITIVE_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9\-\._~+/]+=*/i,
  /\b(?:secret|token|password|session|cookie|key)\s*[:=]\s*\S+/i
];

/** Placeholder string for redacted values. */
const REDACTED = '[REDACTED]';
/** Maximum string length allowed before redaction. */
const MAX_STRING_LENGTH = 2000;

/**
 * Checks if a key is considered sensitive and should be redacted.
 * @param {string} key - Object key to check.
 * @returns {boolean}
 */
function isSensitiveKey(key = '') {
  return SENSITIVE_KEYS.has(String(key).toLowerCase());
}

/**
 * Determines if a string value should be redacted based on patterns or excessive length.
 * @param {string} value
 * @returns {boolean}
 */
function shouldRedactString(value = '') {
  if (value.length > MAX_STRING_LENGTH) {
    return true;
  }
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Sanitizes any value for safe logging, redacting sensitive information and handling
 * special types like Error, Date, ArrayBuffers, etc.
 * @param {*} value - The value to sanitize.
 * @param {WeakSet} [seen] - Used internally to track circular references.
 * @returns {*}
 */
function sanitizeValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Error objects
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle URL objects
  if (value instanceof URL) {
    return value.toString();
  }

  // Handle views on ArrayBuffer
  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name}(${value.byteLength})]`;
  }

  // Handle raw ArrayBuffers
  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer(${value.byteLength})]`;
  }

  const type = typeof value;

  // Strings: redact if needed
  if (type === 'string') {
    if (shouldRedactString(value)) {
      return REDACTED;
    }
    return value;
  }

  // Numbers and booleans: log as is
  if (type === 'number' || type === 'boolean') {
    return value;
  }

  // BigInt: convert to string
  if (type === 'bigint') {
    return value.toString();
  }

  // Functions: log their name or mark as anonymous
  if (type === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  // Arrays: sanitize all items, track circular refs
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const result = value.map((item) => sanitizeValue(item, seen));
    seen.delete(value);
    return result;
  }

  // Objects: sanitize all keys/values, redacting sensitive ones, track circular refs
  if (type === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const result = Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(val, seen);
      return acc;
    }, {});
    seen.delete(value);
    return result;
  }

  // Fallback: convert to string
  return String(value);
}

/**
 * Creates a logger object with info, warn, error, and debug. Handles
 * environment label (CLIENT/SERVER), production filtering, and value sanitization.
 * Uses the console by default.
 * @returns {object} Logger instance.
 */
function createLogger() {
  const isBrowser = typeof window !== 'undefined';
  const runtimeLabel = isBrowser ? 'CLIENT' : 'SERVER';
  const isProd = process.env.NODE_ENV === 'production';

  const consoleWriters = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: (console.debug || console.log).bind(console)
  };

  /**
   * Emits a log message of the given level, with sanitized payload.
   * @param {string} level - Log level ('info', 'warn', 'error', 'debug')
   * @param {...*} payload - Values to log.
   */
  const emit = (level, ...payload) => {
    if (isBrowser && isProd) {
      return;
    }

    const writer = consoleWriters[level] || consoleWriters.info;
    const sanitized = payload.map((entry) => sanitizeValue(entry));
    writer(`[${runtimeLabel}][${level.toUpperCase()}]`, ...sanitized);
  };

  return Object.freeze({
    /**
     * Logs an info message.
     * @param {...*} args
     */
    info: (...args) => emit('info', ...args),

    /**
     * Logs a warning message.
     * @param {...*} args
     */
    warn: (...args) => emit('warn', ...args),

    /**
     * Logs an error message.
     * @param {...*} args
     */
    error: (...args) => emit('error', ...args),
    
    /**
     * Logs a debug message.
     * @param {...*} args
     */
    debug: (...args) => emit('debug', ...args)
  });
}

// Singleton logger instance, shared globally.
const globalScope = globalThis;
const loggerInstance = globalScope.__LUCCI_LOGGER__ || createLogger();

// Cache the logger on the global scope so it stays a singleton.
if (!globalScope.__LUCCI_LOGGER__) {
  globalScope.__LUCCI_LOGGER__ = loggerInstance;
}

/**
 * The global logger instance for the app.
 * Supports info, warn, error, debug methods.
 * Redacts sensitive data and avoids logging in production on the client.
 */
export const logger = loggerInstance;

