import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { INITIAL_SCHEMA } from "./schema.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.resolve(currentDirectory, "../../data/database/openspace.sqlite");

export function createDatabase(databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");

  if (databasePath !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  database.exec(INITIAL_SCHEMA);
  database
    .prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)")
    .run(1);

  return database;
}
