// Translate SQLite column names into the camelCase shape returned by the API.
function mapSheet(row) {
  if (!row) return null;
  return {
    sheetId: row.sheet_id,
    siteId: row.site_id,
    name: row.name,
    createdDate: row.created_date,
    imagePath: row.image_path,
    defaultStartPosition: [row.default_start_x, row.default_start_y, row.default_start_z],
  };
}

function mapProject(row, sheets) {
  return {
    siteId: row.site_id,
    name: row.name,
    address: row.address,
    status: row.status,
    createdDate: row.created_date,
    sheets,
    canUpload: sheets.length > 0,
  };
}

/**
 * Creates the only data-access layer allowed to read or write projects/sheets.
 * Routes call these methods instead of placing SQL inside HTTP handlers.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function createProjectRepository(database) {
  // Early MVP databases contain a required synced_at column. New databases do
  // not need it, but these flags keep existing local catalogues writable.
  const projectHasLegacySync = database.prepare("PRAGMA table_info(projects)")
    .all().some((column) => column.name === "synced_at");
  const sheetHasLegacySync = database.prepare("PRAGMA table_info(sheets)")
    .all().some((column) => column.name === "synced_at");
  const listSheets = database.prepare(
    "SELECT * FROM sheets WHERE site_id = ? ORDER BY display_order, name",
  );

  function list({ includeInactive = false } = {}) {
    const rows = includeInactive
      ? database.prepare("SELECT * FROM projects ORDER BY name").all()
      : database.prepare("SELECT * FROM projects WHERE status = 'active' ORDER BY name").all();
    return rows.map((row) => mapProject(row, listSheets.all(row.site_id).map(mapSheet)));
  }

  function findBySiteId(siteId) {
    const row = database.prepare("SELECT * FROM projects WHERE site_id = ?").get(siteId);
    if (!row) return null;
    return mapProject(row, listSheets.all(siteId).map(mapSheet));
  }

  function findSheet(siteId, sheetId) {
    return mapSheet(
      database.prepare("SELECT * FROM sheets WHERE site_id = ? AND sheet_id = ?").get(siteId, sheetId),
    );
  }

  function upsertProject({ siteId, name, address = null, createdDate = null }) {
    database.prepare(`
      INSERT INTO projects (site_id, name, address, status, created_date${projectHasLegacySync ? ", synced_at" : ""})
      VALUES (?, ?, ?, 'active', ?${projectHasLegacySync ? ", CURRENT_TIMESTAMP" : ""})
      ON CONFLICT(site_id) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        created_date = COALESCE(excluded.created_date, projects.created_date),
        ${projectHasLegacySync ? "synced_at = CURRENT_TIMESTAMP," : ""}
        updated_at = CURRENT_TIMESTAMP
    `).run(siteId, name, address, createdDate);
    return findBySiteId(siteId);
  }

  function upsertSheet({
    siteId,
    sheetId,
    name,
    createdDate = null,
    imagePath = null,
    displayOrder = 0,
    defaultStartPosition = [0, 0, 1.5],
  }) {
    if (!findBySiteId(siteId)) throw new Error(`Project ${siteId} does not exist.`);
    database.prepare(`
      INSERT INTO sheets (
        sheet_id, site_id, name, created_date, image_path, display_order,
        default_start_x, default_start_y, default_start_z${sheetHasLegacySync ? ", synced_at" : ""}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${sheetHasLegacySync ? ", CURRENT_TIMESTAMP" : ""})
      ON CONFLICT(sheet_id) DO UPDATE SET
        site_id = excluded.site_id,
        name = excluded.name,
        created_date = COALESCE(excluded.created_date, sheets.created_date),
        image_path = COALESCE(excluded.image_path, sheets.image_path),
        display_order = excluded.display_order,
        default_start_x = excluded.default_start_x,
        default_start_y = excluded.default_start_y,
        default_start_z = excluded.default_start_z,
        ${sheetHasLegacySync ? "synced_at = CURRENT_TIMESTAMP," : ""}
        updated_at = CURRENT_TIMESTAMP
    `).run(
      sheetId,
      siteId,
      name,
      createdDate,
      imagePath,
      displayOrder,
      ...defaultStartPosition,
    );
    return findSheet(siteId, sheetId);
  }

  function setProjectStatus(siteId, status) {
    const result = database.prepare(
      "UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?",
    ).run(status, siteId);
    if (!result.changes) throw new Error(`Project ${siteId} does not exist.`);
    return findBySiteId(siteId);
  }

  return { findBySiteId, findSheet, list, setProjectStatus, upsertProject, upsertSheet };
}
