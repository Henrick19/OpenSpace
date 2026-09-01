export const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    site_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    synced_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sheets (
    sheet_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER,
    image_id TEXT,
    width REAL,
    height REAL,
    deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
    synced_at TEXT NOT NULL,
    FOREIGN KEY (site_id) REFERENCES projects(site_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    openspace_capture_id TEXT UNIQUE,
    site_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    sheet_id TEXT,
    floor_name TEXT,
    capture_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER CHECK (file_size IS NULL OR file_size >= 0),
    local_file_path TEXT,
    file_sha256 TEXT,
    captured_at TEXT,
    start_x REAL,
    start_y REAL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
      'draft', 'validating', 'importing', 'saved_locally',
      'waiting_for_internet', 'uploading', 'submitted',
      'processing', 'ready', 'failed'
    )),
    upload_progress INTEGER NOT NULL DEFAULT 0 CHECK (upload_progress BETWEEN 0 AND 100),
    upload_started_at TEXT,
    upload_completed_at TEXT,
    submitted_at TEXT,
    processing_completed_at TEXT,
    viewer_url TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS capture_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capture_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    message TEXT,
    progress INTEGER CHECK (progress IS NULL OR progress BETWEEN 0 AND 100),
    created_at TEXT NOT NULL,
    FOREIGN KEY (capture_id) REFERENCES captures(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sheets_site_id ON sheets(site_id);
  CREATE INDEX IF NOT EXISTS idx_captures_site_id ON captures(site_id);
  CREATE INDEX IF NOT EXISTS idx_captures_status ON captures(status);
  CREATE INDEX IF NOT EXISTS idx_captures_captured_at ON captures(captured_at);
  CREATE INDEX IF NOT EXISTS idx_capture_events_capture_id ON capture_events(capture_id);
`;
