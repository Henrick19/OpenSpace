import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/database/openspace.sqlite"),
  OPENSPACE_MODE: z.enum(["mock", "live"]).default("mock"),
  OPENSPACE_BASE_URL: z.string().trim().default(""),
  OPENSPACE_CLIENT_ID: z.string().trim().default(""),
  OPENSPACE_CLIENT_SECRET: z.string().trim().default(""),
  OPENSPACE_STATUS_POLL_INTERVAL_MS: z.coerce.number().int().min(5_000).default(15_000),
  SEED_DEMO_DATA: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
});

export function loadEnvironment(source = process.env) {
  const values = environmentSchema.parse(source);

  if (values.OPENSPACE_MODE === "live") {
    const missing = ["OPENSPACE_BASE_URL", "OPENSPACE_CLIENT_ID", "OPENSPACE_CLIENT_SECRET"]
      .filter((name) => !values[name]);

    if (missing.length > 0) {
      throw new Error(`Live OpenSpace mode requires: ${missing.join(", ")}.`);
    }
  }

  return Object.freeze({
    port: values.PORT,
    webOrigin: values.WEB_ORIGIN,
    databasePath: values.DATABASE_PATH,
    seedDemoData: values.SEED_DEMO_DATA,
    openSpace: Object.freeze({
      mode: values.OPENSPACE_MODE,
      baseUrl: values.OPENSPACE_BASE_URL,
      clientId: values.OPENSPACE_CLIENT_ID,
      clientSecret: values.OPENSPACE_CLIENT_SECRET,
      statusPollIntervalMs: values.OPENSPACE_STATUS_POLL_INTERVAL_MS,
    }),
  });
}
