// Convert a raw sheet row from the SQLite database
// into a cleaner JavaScript object using camelCase.
function mapSheet(row) {
  // If no row was found, return null instead of causing an error.
  if (!row) return null;

  return {
    // Convert database column names from snake_case to camelCase.
    sheetId: row.sheet_id,
    siteId: row.site_id,
    name: row.name,
    createdDate: row.created_date,
    imagePath: row.image_path,

    // Combine the three database coordinate columns
    // into one JavaScript array: [x, y, z].
    defaultStartPosition: [
      row.default_start_x,
      row.default_start_y,
      row.default_start_z,
    ],
  };
}


// Convert a raw project row from the database
// into the format used by the application.
function mapProject(row, sheets) {
  return {
    siteId: row.site_id,
    name: row.name,
    address: row.address,
    status: row.status,
    createdDate: row.created_date,

    // Include all sheets that belong to this project.
    sheets,

    // Allow upload only when the project has at least one sheet.
    canUpload: sheets.length > 0,
  };
}


// Create the project repository.
// The repository is responsible for reading and updating
// project and sheet data in the SQLite database.
export function createProjectRepository(database) {

  // Prepare this query once because it will be reused many times.
  // It retrieves all sheets belonging to a particular project.
  //
  // The "?" is a placeholder for the siteId.
  const listSheets = database.prepare(
    "SELECT * FROM sheets WHERE site_id = ? ORDER BY display_order, name",
  );


  // Return a list of projects.
  //
  // By default, only active projects are returned.
  // If includeInactive is true, all projects are returned.
  function list({ includeInactive = false } = {}) {

    // Choose which SQL query to run depending on includeInactive.
    const rows = includeInactive
      ? database
          .prepare("SELECT * FROM projects ORDER BY name")
          .all()
      : database
          .prepare(
            "SELECT * FROM projects WHERE status = 'active' ORDER BY name",
          )
          .all();

    // Convert every raw project row into an application-friendly object.
    //
    // For each project:
    // 1. Get all of its sheets.
    // 2. Convert each sheet using mapSheet().
    // 3. Convert the project using mapProject().
    return rows.map((row) =>
      mapProject(
        row,
        listSheets.all(row.site_id).map(mapSheet),
      ),
    );
  }


  // Find one project using its unique siteId.
  function findBySiteId(siteId) {

    // .get() returns one matching row instead of an array.
    const row = database
      .prepare("SELECT * FROM projects WHERE site_id = ?")
      .get(siteId);

    // If the project does not exist, return null.
    if (!row) return null;

    // Retrieve all sheets that belong to this project
    // and return the mapped project object.
    return mapProject(
      row,
      listSheets.all(siteId).map(mapSheet),
    );
  }


  // Find one specific sheet belonging to one project.
  function findSheet(siteId, sheetId) {

    // Both siteId and sheetId must match.
    const row = database
      .prepare(
        "SELECT * FROM sheets WHERE site_id = ? AND sheet_id = ?",
      )
      .get(siteId, sheetId);

    // mapSheet() will return null if no sheet was found.
    return mapSheet(row);
  }


  // Insert a new project OR update an existing project.
  //
  // "Upsert" = INSERT + UPDATE.
  function upsertProject({
    siteId,
    name,
    address = null,
    createdDate = null,
  }) {

    database
      .prepare(`
        INSERT INTO projects (
          site_id,
          name,
          address,
          status,
          created_date
        )
        VALUES (?, ?, ?, 'active', ?)

        -- If the project already exists,
        -- update its existing data instead of creating a duplicate.
        ON CONFLICT(site_id) DO UPDATE SET
          name = excluded.name,
          address = excluded.address,

          -- If a new createdDate is provided, use it.
          -- Otherwise keep the existing created_date.
          created_date = COALESCE(
            excluded.created_date,
            projects.created_date
          ),

          updated_at = CURRENT_TIMESTAMP
      `)
      .run(
        siteId,
        name,
        address,
        createdDate,
      );

    // Return the newly inserted or updated project.
    return findBySiteId(siteId);
  }


  // Insert a new sheet OR update an existing sheet.
  function upsertSheet({
    siteId,
    sheetId,
    name,
    createdDate = null,
    imagePath = null,
    displayOrder = 0,

    // Default starting position if no position is provided.
    defaultStartPosition = [0, 0, 1.5],
  }) {

    // A sheet must belong to an existing project.
    // Stop and throw an error if the project does not exist.
    if (!findBySiteId(siteId)) {
      throw new Error(
        `Project ${siteId} does not exist.`,
      );
    }

    database
      .prepare(`
        INSERT INTO sheets (
          sheet_id,
          site_id,
          name,
          created_date,
          image_path,
          display_order,
          default_start_x,
          default_start_y,
          default_start_z
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

        -- If the sheet already exists,
        -- update the existing row.
        
        ON CONFLICT(sheet_id) DO UPDATE SET

          -- Allow the sheet to be assigned to another project.
          site_id = excluded.site_id,

          name = excluded.name,

          -- Keep the existing created_date
          -- if the new value is null.
          created_date = COALESCE(
            excluded.created_date,
            sheets.created_date
          ),

          -- Keep the existing image path
          -- if no new imagePath is provided.
          image_path = COALESCE(
            excluded.image_path,
            sheets.image_path
          ),

          display_order = excluded.display_order,

          // Update the default starting coordinates.
          default_start_x = excluded.default_start_x,
          default_start_y = excluded.default_start_y,
          default_start_z = excluded.default_start_z,

          updated_at = CURRENT_TIMESTAMP
      `)
      .run(
        sheetId,
        siteId,
        name,
        createdDate,
        imagePath,
        displayOrder,

        // Spread [x, y, z] into three separate values.
        ...defaultStartPosition,
      );

    // Return the newly inserted or updated sheet.
    return findSheet(siteId, sheetId);
  }


  // Change the status of a project.
  //
  // Example:
  // active -> inactive
  function setProjectStatus(siteId, status) {

    const result = database
      .prepare(`
        UPDATE projects
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE site_id = ?
      `)
      .run(status, siteId);

    // result.changes tells us how many rows were updated.
    //
    // If zero rows changed, the project does not exist.
    if (!result.changes) {
      throw new Error(
        `Project ${siteId} does not exist.`,
      );
    }

    // Return the updated project.
    return findBySiteId(siteId);
  }


  // Expose these repository functions so other files
  // can use them.
  return {
    findBySiteId,
    findSheet,
    list,
    setProjectStatus,
    upsertProject,
    upsertSheet,
  };
}