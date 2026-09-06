import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { INITIAL_SCHEMA } from "./schema.js";
import { seedProjectCatalog } from "./seed.js";

export function createDatabase(databasePath) {

  // If we're using a real .db file,
  // make sure its parent folder exists.
  if (databasePath !== ":memory:") {
    fs.mkdirSync(
      path.dirname(databasePath),
      { recursive: true }
    );
  }

  // Open/create the SQLite database.
  const database = new Database(databasePath);

  // Enforce foreign key relationships.
  database.pragma("foreign_keys = ON");

  // Wait up to 5 seconds if SQLite is temporarily locked.
  database.pragma("busy_timeout = 5000");

  // Improve read/write concurrency for file databases.
  if (databasePath !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  // Create the database tables/indexes/etc.
  database.exec(INITIAL_SCHEMA);

  // Insert or update the predefined projects and sheets.
  seedProjectCatalog(database);

  // Give the database connection back to the application.
  return database;
}