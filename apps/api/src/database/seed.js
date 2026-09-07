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

// inserting the project seed data into the database
export function seedProjectCatalog(database) {
  const insertProject = database.prepare(`
    INSERT INTO projects (site_id, name, address, status, created_date)
    VALUES (@siteId, @name, @address, @status, @createdDate)
    ON CONFLICT(site_id) DO UPDATE SET  
      name = excluded.name,
      address = excluded.address,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `);
  const insertSheet = database.prepare(`
    INSERT INTO sheets (
      sheet_id, site_id, name, created_date, display_order,
      default_start_x, default_start_y, default_start_z
    ) VALUES (
      @sheetId, @siteId, @name, @createdDate, @displayOrder, 0, 0, 1.5
    )
    ON CONFLICT(sheet_id) DO UPDATE SET
      name = excluded.name,
      created_date = excluded.created_date,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `);

  // creates a database transaction to insert the project and sheet seed data into the database
  // transactions treat all these databse operations as one operation, so if any of them fail, the entire transaction will be rolled back and no changes will be made to the database
  const seed = database.transaction(() => {
    for (const project of PROJECTS) insertProject.run({ ...project, createdDate: null });
    for (const sheet of SHEETS) insertSheet.run(sheet);
  });
  seed();
}

export { PROJECTS, SHEETS };
