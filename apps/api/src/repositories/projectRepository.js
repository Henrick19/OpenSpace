// Translate SQLite column names into the camelCase shape returned by the API.
function mapSheet(row) {
  if (!row) return null;
  return {
    sheetId: row.sheet_id,
    siteId: row.site_id,
    name: row.name,
    defaultStartPosition: [row.default_start_x, row.default_start_y, row.default_start_z],
  };
}

function mapProject(row, sheets) {
  return {
    siteId: row.site_id,
    name: row.name,
    status: row.status,
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
  const listSheets = database.prepare(
    "SELECT * FROM sheets WHERE site_id = ? ORDER BY name",
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

  function findSheetById(sheetId) {
    return mapSheet(database.prepare("SELECT * FROM sheets WHERE sheet_id = ?").get(sheetId));
  }

  function upsertProject({ siteId, name }) {
    database.prepare(`
      INSERT INTO projects (site_id, name, status)
      VALUES (?, ?, 'active')
      ON CONFLICT(site_id) DO UPDATE SET
        name = excluded.name,
        status = 'active'
    `).run(siteId, name);
    return findBySiteId(siteId);
  }

  function upsertSheet({
    siteId,
    sheetId,
    name,
    defaultStartPosition = [0, 0, 1.5],
  }) {
    if (!findBySiteId(siteId)) throw new Error(`Project ${siteId} does not exist.`);
    database.prepare(`
      INSERT INTO sheets (
        sheet_id, site_id, name, default_start_x, default_start_y, default_start_z
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(sheet_id) DO UPDATE SET
        site_id = excluded.site_id,
        name = excluded.name,
        default_start_x = excluded.default_start_x,
        default_start_y = excluded.default_start_y,
        default_start_z = excluded.default_start_z
    `).run(
      sheetId,
      siteId,
      name,
      ...defaultStartPosition,
    );
    return findSheet(siteId, sheetId);
  }

  function setProjectStatus(siteId, status) {
    const result = database.prepare(
      "UPDATE projects SET status = ? WHERE site_id = ?",
    ).run(status, siteId);
    if (!result.changes) throw new Error(`Project ${siteId} does not exist.`);
    return findBySiteId(siteId);
  }

  // Save a new project and its optional first sheet as one SQLite transaction.
  const createProjectWithOptionalSheet = database.transaction((project, sheet = null) => {
    upsertProject(project);
    if (sheet) upsertSheet({ ...sheet, siteId: project.siteId });
    return findBySiteId(project.siteId);
  });

  return {
    createProjectWithOptionalSheet,
    findBySiteId,
    findSheet,
    findSheetById,
    list,
    setProjectStatus,
    upsertProject,
    upsertSheet,
  };
}
