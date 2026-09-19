import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { migrateDatabase } from "./migrations.js";
import { INITIAL_SCHEMA } from "./schema.js";
import { seedProjectCatalog } from "./seed.js";

/**
 * Opens SQLite, enables reliability settings, creates the schema and seeds the
 * PSB-managed project catalogue.
 *
 * @param {string} databasePath Absolute path or ":memory:" for automated tests.
 * @returns {import("better-sqlite3").Database}
 */
export function createDatabase(databasePath) {
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  // Foreign keys protect relationships; WAL improves normal local concurrency.
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  if (databasePath !== ":memory:") database.pragma("journal_mode = WAL");
  database.exec(INITIAL_SCHEMA);
  migrateDatabase(database);
  seedProjectCatalog(database);
  return database;
}
