const PROJECT_COLUMNS = ["site_id", "name", "status"];
const SHEET_COLUMNS = [
  "sheet_id", "site_id", "name",
  "default_start_x", "default_start_y", "default_start_z",
];

function columnNames(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function hasExactColumns(database, table, expected) {
  const actual = columnNames(database, table);
  return actual.length === expected.length && actual.every((column, index) => column === expected[index]);
}

/**
 * Rebuilds legacy project/sheet tables into the minimal local catalogue.
 * Upload rows and their foreign-key values are preserved.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function migrateDatabase(database) {
  const uploadColumns = new Set(columnNames(database, "uploads"));
  if (!uploadColumns.has("pending_seen")) {
    database.exec("ALTER TABLE uploads ADD COLUMN pending_seen INTEGER NOT NULL DEFAULT 0");
  }

  if (hasExactColumns(database, "projects", PROJECT_COLUMNS)
      && hasExactColumns(database, "sheets", SHEET_COLUMNS)) return;

  const sheetColumns = new Set(columnNames(database, "sheets"));
  const startValue = (column, fallback) => sheetColumns.has(column)
    ? `COALESCE(${column}, ${fallback})`
    : `${fallback}`;

  database.pragma("foreign_keys = OFF");
  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE projects_migrated (
          site_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
        );
        INSERT INTO projects_migrated (site_id, name, status)
        SELECT site_id, name,
               CASE WHEN status = 'inactive' THEN 'inactive' ELSE 'active' END
        FROM projects;

        CREATE TABLE sheets_migrated (
          sheet_id TEXT PRIMARY KEY,
          site_id TEXT NOT NULL,
          name TEXT NOT NULL,
          default_start_x REAL NOT NULL DEFAULT 0,
          default_start_y REAL NOT NULL DEFAULT 0,
          default_start_z REAL NOT NULL DEFAULT 1.5,
          FOREIGN KEY (site_id) REFERENCES projects(site_id) ON DELETE CASCADE
        );
        INSERT INTO sheets_migrated (
          sheet_id, site_id, name, default_start_x, default_start_y, default_start_z
        )
        SELECT sheet_id, site_id, name,
               ${startValue("default_start_x", 0)},
               ${startValue("default_start_y", 0)},
               ${startValue("default_start_z", 1.5)}
        FROM sheets;

        DROP TABLE sheets;
        DROP TABLE projects;
        ALTER TABLE projects_migrated RENAME TO projects;
        ALTER TABLE sheets_migrated RENAME TO sheets;
        CREATE INDEX idx_sheets_site ON sheets(site_id);
      `);
    })();
  } finally {
    database.pragma("foreign_keys = ON");
  }

  const violations = database.pragma("foreign_key_check");
  if (violations.length > 0) throw new Error("Project catalogue migration failed its foreign-key check.");
}
