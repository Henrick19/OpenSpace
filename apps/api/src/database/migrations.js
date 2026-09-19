// Columns added after the first local SQLite prototype. SQLite's
// CREATE TABLE IF NOT EXISTS does not update tables that already exist, so
// these additions keep older developer databases compatible with the app.
const REQUIRED_COLUMNS = Object.freeze({
  projects: [
    "address TEXT",
    "created_date TEXT",
    "created_at TEXT",
    "updated_at TEXT",
  ],
  sheets: [
    "created_date TEXT",
    "image_path TEXT",
    "default_start_x REAL NOT NULL DEFAULT 0",
    "default_start_y REAL NOT NULL DEFAULT 0",
    "default_start_z REAL NOT NULL DEFAULT 1.5",
    "created_at TEXT",
    "updated_at TEXT",
  ],
  uploads: [
    "pending_seen INTEGER NOT NULL DEFAULT 0",
  ],
});

/**
 * Adds missing columns to databases created by earlier MVP versions.
 * The migration is additive and preserves all existing project and upload data.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function migrateDatabase(database) {
  const migrate = database.transaction(() => {
    for (const [table, definitions] of Object.entries(REQUIRED_COLUMNS)) {
      const existingColumns = new Set(
        database.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name),
      );

      for (const definition of definitions) {
        const columnName = definition.split(" ", 1)[0];
        if (!existingColumns.has(columnName)) {
          database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
        }
      }
    }

    // Populate audit timestamps for rows that existed before these columns.
    database.exec(`
      UPDATE projects
      SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
          updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
      UPDATE sheets
      SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
          updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
    `);
  });

  migrate();
}
