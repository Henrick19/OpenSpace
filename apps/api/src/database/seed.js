// Approved PSB projects are maintained locally because the private integration
// does not provide a supported endpoint for listing an organisation's projects.
const PROJECTS = [
  {
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "PSB Academy - City Campus",
    address: "6 Raffles Blvd, Singapore, 039594",
    status: "active",
  },
  {
    siteId: "0kv8zyqITsaTLTk3DDFaUQ",
    name: "PSB Academy - Robotics",
    address: "6 Raffles Blvd, Singapore, 039594",
    status: "active",
  },
];

const SHEETS = [
  {
    sheetId: "ov2OjSjTT-WBP_dgeedIlw",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L3 - Main Wing",
    createdDate: "2026-08-21",
    displayOrder: 1,
  },
  {
    sheetId: "OTIkXg4IQK6vR3-uQmz2Pg",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L4 - Main Wing",
    createdDate: "2026-08-21",
    displayOrder: 2,
  },
  {
    sheetId: "KdiCALU6QmSLTbirHJ_DFg",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L4 - Stem Wing",
    createdDate: "2026-08-21",
    displayOrder: 3,
  },
];

/**
 * Inserts or refreshes the known project and sheet display data.
 * Existing upload history is not changed.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function seedProjectCatalog(database) {
  const projectHasLegacySync = database.prepare("PRAGMA table_info(projects)")
    .all().some((column) => column.name === "synced_at");
  const sheetHasLegacySync = database.prepare("PRAGMA table_info(sheets)")
    .all().some((column) => column.name === "synced_at");

  const insertProject = database.prepare(`
    INSERT INTO projects (site_id, name, address, status, created_date${projectHasLegacySync ? ", synced_at" : ""})
    VALUES (@siteId, @name, @address, @status, @createdDate${projectHasLegacySync ? ", CURRENT_TIMESTAMP" : ""})
    ON CONFLICT(site_id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      status = excluded.status,
      ${projectHasLegacySync ? "synced_at = CURRENT_TIMESTAMP," : ""}
      updated_at = CURRENT_TIMESTAMP
  `);
  const insertSheet = database.prepare(`
    INSERT INTO sheets (
      sheet_id, site_id, name, created_date, display_order,
      default_start_x, default_start_y, default_start_z${sheetHasLegacySync ? ", synced_at" : ""}
    ) VALUES (
      @sheetId, @siteId, @name, @createdDate, @displayOrder, 0, 0, 1.5
      ${sheetHasLegacySync ? ", CURRENT_TIMESTAMP" : ""}
    )
    ON CONFLICT(sheet_id) DO UPDATE SET
      name = excluded.name,
      created_date = excluded.created_date,
      display_order = excluded.display_order,
      ${sheetHasLegacySync ? "synced_at = CURRENT_TIMESTAMP," : ""}
      updated_at = CURRENT_TIMESTAMP
  `);

  // Use one transaction so projects and their sheets are updated together.
  const seed = database.transaction(() => {
    for (const project of PROJECTS) insertProject.run({ ...project, createdDate: null });
    for (const sheet of SHEETS) insertSheet.run(sheet);
  });
  seed();
}

export { PROJECTS, SHEETS };
