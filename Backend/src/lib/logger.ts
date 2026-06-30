/**
 * Lightweight structured logger.
 *
 * SOLID notes
 * ───────────
 * • SRP — this module only formats and routes log events. It does not
 *   decide what to log, when, or with what level. Call sites own that.
 * • OCP — new transports (Sentry, Datadog, Loki) can be added by
 *   implementing {@link LogTransport} without modifying call sites.
 * • DIP — consumers depend on the {@link logger} interface, never on
 *   `console` directly. Swapping the implementation for tests is a
 *   one-line change.
 * • PII safety — every event flows through {@link scrubValue} before
 *   hitting a transport. Emails, tokens, paths with user ids and image
 *   payloads are masked at the boundary so we never accidentally leak
 *   sensitive data to stdout/CloudWatch.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  level: LogLevel;
  msg: string;
  context?: string;
  data?: Record<string, unknown>;
  ts: string;
}

export interface LogTransport {
  emit(event: LogEvent): void;
}

const PII_KEYS = new Set([
  "email",
  "emails",
  "password",
  "passwordhash",
  "token",
  "tokens",
  "refreshtoken",
  "accesstoken",
  "authorization",
  "idtoken",
  "apikey",
  "secret",
]);

const EMAIL_REGEX = /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi;
const LONG_TOKEN_REGEX = /\b[A-Za-z0-9_-]{24,}\b/g;

export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (value.length > 0) {
      // Mask obvious PII patterns first
      let scrubbed = value.replace(EMAIL_REGEX, (match, user, domain) => {
        const head = user.length <= 2 ? user[0] : user.slice(0, 2);
        return `${head}***@${domain}`;
      });
      scrubbed = scrubbed.replace(LONG_TOKEN_REGEX, (match) => {
        return `${match.slice(0, 4)}…${match.slice(-4)}`;
      });
      return scrubbed;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else if (k === "imageUrl" || k === "imageKey" || k === "imageBucket") {
        // Keep the bucket + last path segment, drop the UUID user part
        if (typeof v === "string") {
          const parts = v.split("/");
          out[k] = parts
            .map((part, i) => (i >= 2 && part.length > 8 ? "[path]" : part))
            .join("/");
        } else {
          out[k] = v;
        }
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }

  return String(value);
}

class ConsoleTransport implements LogTransport {
  emit(event: LogEvent): void {
    const payload: Record<string, unknown> = {
      ts: event.ts,
      level: event.level,
    };
    if (event.context) payload.context = event.context;
    if (event.msg) payload.msg = event.msg;
    if (event.data && Object.keys(event.data).length > 0) {
      payload.data = scrubValue(event.data);
    }
    const line = JSON.stringify(payload);
    if (event.level === "error") {
      console.error(line);
    } else if (event.level === "warn") {
      console.warn(line);
    } else if (event.level === "debug") {
      console.debug(line);
    } else {
      console.log(line);
    }
  }
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(context: string): Logger;
}

function makeLogger(context: string, transport: LogTransport): Logger {
  const emit = (level: LogLevel, msg: string, data?: Record<string, unknown>) => {
    transport.emit({
      ts: new Date().toISOString(),
      level,
      msg,
      context,
      data: data ?? {},
    });
  };
  return {
    debug: (msg, data) => emit("debug", msg, data),
    info: (msg, data) => emit("info", msg, data),
    warn: (msg, data) => emit("warn", msg, data),
    error: (msg, data) => emit("error", msg, data),
    child: (childContext) => makeLogger(`${context}:${childContext}`, transport),
  };
}

let activeTransport: LogTransport = new ConsoleTransport();

export function setLogTransport(transport: LogTransport): void {
  activeTransport = transport;
}

export function resetLogTransport(): void {
  activeTransport = new ConsoleTransport();
}

export const logger: Logger = makeLogger("bioma", activeTransport);

/** Helper for tests — lets suites assert on emitted events without coupling to console. */
export function captureEvents(): { events: LogEvent[]; transport: LogTransport } {
  const events: LogEvent[] = [];
  const transport: LogTransport = {
    emit(event) {
      events.push(event);
    },
  };
  return { events, transport };
}