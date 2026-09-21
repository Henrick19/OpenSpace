import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

// Relative paths in .env are resolved from apps/api rather than the terminal's folder.
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Validate every supported environment variable and provide safe local defaults.
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/database/openspace.sqlite"),
  UPLOAD_DIRECTORY: z.string().trim().min(1).default("./data/uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024 * 1024),
  OPENSPACE_MODE: z.enum(["mock", "live"]).default("mock"),
  OPENSPACE_BASE_URL: z.string().url().default("https://sgp.openspace.ai"),
  OPENSPACE_WEB_URL: z.string().url().default("https://sgp.openspace.ai/login"),
  OPENSPACE_AUTH_URL: z.string().url().default("https://login.openspace.ai/oauth/token"),
  OPENSPACE_CLIENT_ID: z.string().default(""),
  OPENSPACE_CLIENT_SECRET: z.string().default(""),
  OPENSPACE_USERNAME: z.string().default(""),
  OPENSPACE_PASSWORD: z.string().default(""),
  OPENSPACE_STATUS_POLL_INTERVAL_MS: z.coerce.number().int().min(5000).default(15000),
  OPENSPACE_STATUS_POLL_TIMEOUT_MS: z.coerce.number().int().min(60000).default(86400000),
  OPENSPACE_DEFAULT_DEVICE_ID: z.string().default(""),
  MOCK_UPLOAD_STEP_DELAY_MS: z.coerce.number().int().min(25).default(250),
  MOCK_PROCESSING_DELAY_MS: z.coerce.number().int().min(100).default(1500),
});

function resolveFromApiRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
}

/**
 * Parses runtime configuration and returns the normalized settings used by the API.
 * Live mode is rejected unless all OpenSpace credentials are present server-side.
 *
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} source
 * @returns {Readonly<object>}
 */
export function loadEnvironment(source = process.env) {
  const values = schema.parse(source);
  if (values.OPENSPACE_MODE === "live") {
    const required = [
      "OPENSPACE_CLIENT_ID",
      "OPENSPACE_CLIENT_SECRET",
      "OPENSPACE_USERNAME",
      "OPENSPACE_PASSWORD",
    ];
    const missing = required.filter((key) => !values[key].trim());
    if (missing.length) throw new Error(`Live mode requires ${missing.join(", ")}.`);
  }

  // Freeze the configuration so feature code cannot accidentally change it at runtime.
  return Object.freeze({
    port: values.PORT,
    webOrigin: values.WEB_ORIGIN,
    databasePath: resolveFromApiRoot(values.DATABASE_PATH),
    uploadDirectory: resolveFromApiRoot(values.UPLOAD_DIRECTORY),
    maxUploadBytes: values.MAX_UPLOAD_BYTES,
    defaultDeviceId: values.OPENSPACE_DEFAULT_DEVICE_ID,
    openSpace: Object.freeze({
      mode: values.OPENSPACE_MODE,
      baseUrl: values.OPENSPACE_BASE_URL.replace(/\/$/, ""),
      webUrl: values.OPENSPACE_WEB_URL,
      authUrl: values.OPENSPACE_AUTH_URL,
      clientId: values.OPENSPACE_CLIENT_ID,
      clientSecret: values.OPENSPACE_CLIENT_SECRET,
      username: values.OPENSPACE_USERNAME,
      password: values.OPENSPACE_PASSWORD,
      pollIntervalMs: values.OPENSPACE_STATUS_POLL_INTERVAL_MS,
      pollTimeoutMs: values.OPENSPACE_STATUS_POLL_TIMEOUT_MS,
      mockStepDelayMs: values.MOCK_UPLOAD_STEP_DELAY_MS,
      mockProcessingDelayMs: values.MOCK_PROCESSING_DELAY_MS,
    }),
  });
}
