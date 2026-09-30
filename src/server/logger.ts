/**
 * Structured JSON logging. On Cloud Run each line becomes a Cloud Logging entry with the
 * right severity; locally it stays readable.
 */
type Level = "debug" | "info" | "warn" | "error";

const SEVERITY: Record<Level, string> = { debug: "DEBUG", info: "INFO", warn: "WARNING", error: "ERROR" };
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): Level {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (configured && configured in ORDER) return configured;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function write(level: Level, message: string, fields?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" || ORDER[level] < ORDER[minLevel()]) return;
  const entry = { severity: SEVERITY[level], message, time: new Date().toISOString(), ...fields };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};
