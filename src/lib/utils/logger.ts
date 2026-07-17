/* eslint-disable no-console -- this module is the single sanctioned wrapper around console.* */

/**
 * Minimal structured logger. Application code must import this instead of
 * calling `console.*` directly (enforced by the `no-console` ESLint rule).
 * Debug-level logs are suppressed in production builds.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLog(level: LogLevel): boolean {
  if (level === "debug") {
    return process.env.NODE_ENV !== "production";
  }
  return true;
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  const prefix = `[${level.toUpperCase()}]`;
  switch (level) {
    case "error":
      console.error(prefix, message, meta ?? "");
      break;
    case "warn":
      console.warn(prefix, message, meta ?? "");
      break;
    case "info":
      console.info(prefix, message, meta ?? "");
      break;
    default:
      console.debug(prefix, message, meta ?? "");
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};
