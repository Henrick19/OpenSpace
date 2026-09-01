function mapProject(row) {
  return {
    siteId: row.site_id,
    name: row.name,
    region: row.region,
    status: row.status,
    syncedAt: row.synced_at,
  };
}

export function createProjectRepository(database) {
  function list() {
    return database.prepare("SELECT * FROM projects ORDER BY name").all().map(mapProject);
  }

  function count() {
    return database.prepare("SELECT COUNT(*) AS total FROM projects WHERE status = 'active'").get().total;
  }

  return { count, list };
}
