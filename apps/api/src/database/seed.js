export const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS projects (
    site_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sheets (
    sheet_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_date TEXT,
    image_path TEXT,
    default_start_x REAL NOT NULL DEFAULT 0,
    default_start_y REAL NOT NULL DEFAULT 0,
    default_start_z REAL NOT NULL DEFAULT 1.5,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES projects(site_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    capture_id TEXT,
    openspace_upload_id TEXT,
    site_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    sheet_id TEXT NOT NULL,
    floor_name TEXT NOT NULL,
    capture_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_filename TEXT NOT NULL,
    local_file_path TEXT,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    captured_at TEXT NOT NULL,
    start_micro INTEGER NOT NULL,
    start_x REAL NOT NULL DEFAULT 0,
    start_y REAL NOT NULL DEFAULT 0,
    start_z REAL NOT NULL DEFAULT 1.5,
    status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN (
      'staged', 'uploading', 'submitted', 'processing', 'completed', 'failed', 'cancelled'
    )),
    upload_progress INTEGER NOT NULL DEFAULT 0 CHECK (upload_progress BETWEEN 0 AND 100),
    bytes_sent INTEGER NOT NULL DEFAULT 0 CHECK (bytes_sent >= 0),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    error_message TEXT,
    viewer_url TEXT,
    local_file_deleted INTEGER NOT NULL DEFAULT 0 CHECK (local_file_deleted IN (0, 1)),
    upload_started_at TEXT,
    submitted_at TEXT,
    processing_completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (site_id) REFERENCES projects(site_id),
    FOREIGN KEY (sheet_id) REFERENCES sheets(sheet_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sheets_site ON sheets(site_id);
  CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
  CREATE INDEX IF NOT EXISTS idx_uploads_site ON uploads(site_id);
  CREATE INDEX IF NOT EXISTS idx_uploads_captured ON uploads(captured_at);
  CREATE INDEX IF NOT EXISTS idx_uploads_created ON uploads(created_at);
`;
