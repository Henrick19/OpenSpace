// Approved PSB projects are maintained locally because the private integration
// does not provide a supported endpoint for listing an organisation's projects.
const PROJECTS = [
  {
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "PSB Academy - City Campus",
    status: "active",
  },
  {
    siteId: "0kv8zyqITsaTLTk3DDFaUQ",
    name: "PSB Academy - Robotics",
    status: "active",
  },
];

const SHEETS = [
  {
    sheetId: "ov2OjSjTT-WBP_dgeedIlw",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L3 - Main Wing",
  },
  {
    sheetId: "OTIkXg4IQK6vR3-uQmz2Pg",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L4 - Main Wing",
  },
  {
    sheetId: "KdiCALU6QmSLTbirHJ_DFg",
    siteId: "3veiB-IWQeueTCR09xrR6g",
    name: "L4 - STEM Wing",
  },
];

/**
 * Inserts or refreshes the known project and sheet display data.
 * Existing upload history is not changed.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function seedProjectCatalog(database) {
  const insertProject = database.prepare(`
    INSERT INTO projects (site_id, name, status)
    VALUES (@siteId, @name, @status)
    ON CONFLICT(site_id) DO UPDATE SET
      name = excluded.name,
      status = excluded.status
  `);
  const insertSheet = database.prepare(`
    INSERT INTO sheets (
      sheet_id, site_id, name, default_start_x, default_start_y, default_start_z
    ) VALUES (
      @sheetId, @siteId, @name, 0, 0, 1.5
    )
    ON CONFLICT(sheet_id) DO UPDATE SET
      site_id = excluded.site_id,
      name = excluded.name
  `);

  // Use one transaction so projects and their sheets are updated together.
  const seed = database.transaction(() => {
    for (const project of PROJECTS) insertProject.run(project);
    for (const sheet of SHEETS) insertSheet.run(sheet);
  });
  seed();
}

export { PROJECTS, SHEETS };
