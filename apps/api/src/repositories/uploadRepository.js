import { randomUUID } from "node:crypto";

import { ACTIVE_UPLOAD_STATUSES, DEFAULT_PAGE_SIZE } from "@openspace/shared";

// Keep database-specific names and flags out of API responses.
function mapUpload(row) {
  if (!row) return null;
  return {
    id: row.id,
    captureId: row.capture_id,
    openSpaceUploadId: row.openspace_upload_id,
    siteId: row.site_id,
    projectName: row.project_name,
    sheetId: row.sheet_id,
    floorName: row.floor_name,
    captureName: row.capture_name,
    deviceId: row.device_id,
    fileName: row.device_filename,
    fileSize: row.file_size,
    capturedAt: row.captured_at,
    startMicro: row.start_micro,
    startPosition: [row.start_x, row.start_y, row.start_z],
    status: row.status,
    uploadProgress: row.upload_progress,
    bytesSent: row.bytes_sent,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    viewerUrl: row.viewer_url,
    pendingSeen: Boolean(row.pending_seen),
    localFileDeleted: Boolean(row.local_file_deleted),
    uploadStartedAt: row.upload_started_at,
    submittedAt: row.submitted_at,
    processingCompletedAt: row.processing_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Provides all SQLite operations for upload records, history, dashboard counts,
 * progress updates, retries and terminal states.
 *
 * @param {import("better-sqlite3").Database} database
 */
export function createUploadRepository(database) {
  function findById(id, { includeLocalPath = false } = {}) {
    const row = database.prepare("SELECT * FROM uploads WHERE id = ?").get(id);
    if (!row) return null;
    const upload = mapUpload(row);
    if (includeLocalPath) upload.localFilePath = row.local_file_path;
    return upload;
  }

  function requireUpload(id, options) {
    const upload = findById(id, options);
    if (!upload) throw new Error("Upload was not found.");
    return upload;
  }

  function create(input) {
    // Create the durable local record before background OpenSpace work starts.
    const now = new Date().toISOString();
    const id = randomUUID();
    database.prepare(`
      INSERT INTO uploads (
        id, site_id, project_name, sheet_id, floor_name, capture_name,
        device_id, device_filename, local_file_path, file_size, captured_at,
        start_micro, start_x, start_y, start_z, status, created_at, updated_at
      ) VALUES (
        @id, @siteId, @projectName, @sheetId, @floorName, @captureName,
        @deviceId, @fileName, @localFilePath, @fileSize, @capturedAt,
        @startMicro, @startX, @startY, @startZ, 'staged', @now, @now
      )
    `).run({ id, ...input, now });
    return findById(id);
  }

  function list(filters = {}) {
    // Build the WHERE clause only from supported filters; values stay parameterized.
    const conditions = [];
    const parameters = {};
    if (filters.search) {
      conditions.push(`(
        capture_name LIKE @search OR device_filename LIKE @search OR
        project_name LIKE @search OR floor_name LIKE @search
      )`);
      parameters.search = `%${filters.search}%`;
    }
    if (filters.status) {
      conditions.push("status = @status");
      parameters.status = filters.status;
    }
    if (filters.siteId) {
      conditions.push("site_id = @siteId");
      parameters.siteId = filters.siteId;
    }
    if (filters.from) {
      conditions.push("captured_at >= @from");
      parameters.from = filters.from;
    }
    if (filters.to) {
      conditions.push("captured_at <= @to");
      parameters.to = filters.to;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageSize = Math.min(Math.max(Number(filters.pageSize) || DEFAULT_PAGE_SIZE, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);
    parameters.limit = pageSize;
    parameters.offset = (page - 1) * pageSize;
    const rows = database.prepare(`
      SELECT * FROM uploads ${where}
      ORDER BY created_at DESC LIMIT @limit OFFSET @offset
    `).all(parameters);
    const total = database.prepare(`SELECT COUNT(*) AS total FROM uploads ${where}`).get(parameters).total;
    return { items: rows.map(mapUpload), page, pageSize, total };
  }

  function getRecent(limit = 5) {
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    return database.prepare("SELECT * FROM uploads ORDER BY created_at DESC LIMIT ?")
      .all(safeLimit).map(mapUpload);
  }

  function getDashboardSummary() {
    const activePlaceholders = ACTIVE_UPLOAD_STATUSES.map(() => "?").join(",");
    const row = database.prepare(`
      SELECT COUNT(*) AS total_uploads,
        SUM(CASE WHEN status IN (${activePlaceholders}) THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM uploads
    `).get(...ACTIVE_UPLOAD_STATUSES);
    return {
      totalUploads: row.total_uploads,
      inProgress: row.in_progress ?? 0,
      completed: row.completed ?? 0,
      failed: row.failed ?? 0,
    };
  }

  function updateTransferProgress(id, patch) {
    // This percentage represents Node.js-to-OpenSpace bytes, not processing progress.
    requireUpload(id);
    const now = new Date().toISOString();
    const fileSize = Math.max(patch.fileSize || 0, 1);
    const bytesSent = Math.min(Math.max(patch.bytesSent || 0, 0), fileSize);
    const progress = Math.min(100, Math.round((bytesSent / fileSize) * 100));
    database.prepare(`
      UPDATE uploads SET status = 'uploading', bytes_sent = ?, upload_progress = ?,
        upload_started_at = COALESCE(upload_started_at, ?), updated_at = ? WHERE id = ?
    `).run(bytesSent, progress, now, now, id);
    return findById(id);
  }

  function setRemoteIds(id, captureId, uploadId) {
    requireUpload(id);
    database.prepare(`
      UPDATE uploads SET capture_id = ?, openspace_upload_id = ?, updated_at = ? WHERE id = ?
    `).run(captureId, uploadId, new Date().toISOString(), id);
  }

  function markSubmitted(id, viewerUrl) {
    requireUpload(id);
    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads SET status = 'submitted', bytes_sent = file_size, upload_progress = 100,
        viewer_url = ?, submitted_at = ?, updated_at = ? WHERE id = ?
    `).run(viewerUrl ?? null, now, now, id);
    return findById(id);
  }

  function markProcessing(id) {
    requireUpload(id);
    database.prepare("UPDATE uploads SET status = 'processing', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
    return findById(id);
  }

  function markPendingSeen(id) {
    requireUpload(id);
    database.prepare(`
      UPDATE uploads SET pending_seen = 1, status = 'processing', updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    return findById(id);
  }

  function markCompleted(id) {
    requireUpload(id);
    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads SET status = 'completed', upload_progress = 100,
        error_message = NULL, processing_completed_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, id);
    return findById(id);
  }

  function markFailed(id, errorMessage) {
    requireUpload(id);
    database.prepare("UPDATE uploads SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?")
      .run(String(errorMessage || "Upload failed."), new Date().toISOString(), id);
    return findById(id);
  }

  function markCancelled(id) {
    requireUpload(id);
    database.prepare("UPDATE uploads SET status = 'cancelled', error_message = NULL, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
    return findById(id);
  }

  function markLocalFileDeleted(id) {
    database.prepare(`
      UPDATE uploads SET local_file_path = NULL, local_file_deleted = 1, updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
  }

  function prepareRetry(id) {
    // A retry is possible only while the staged local file still exists.
    const upload = requireUpload(id, { includeLocalPath: true });
    if (!["failed", "cancelled"].includes(upload.status)) {
      throw new Error("Only a failed or cancelled upload can be retried.");
    }
    if (!upload.localFilePath) throw new Error("The local INSV file is no longer available for retry.");
    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads SET capture_id = NULL, openspace_upload_id = NULL, status = 'staged',
        upload_progress = 0, bytes_sent = 0, retry_count = retry_count + 1,
        error_message = NULL, pending_seen = 0, submitted_at = NULL, processing_completed_at = NULL,
        updated_at = ? WHERE id = ?
    `).run(now, id);
    return findById(id, { includeLocalPath: true });
  }

  function prepareProcessingCheckRetry(id) {
    const upload = requireUpload(id);
    if (upload.status !== "failed" || !upload.captureId || !upload.localFileDeleted) {
      throw new Error("This upload is not eligible for a processing-status retry.");
    }
    database.prepare(`
      UPDATE uploads SET status = 'processing', error_message = NULL,
        retry_count = retry_count + 1, updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    return findById(id);
  }

  function listForProcessingResume() {
    return database.prepare("SELECT * FROM uploads WHERE status IN ('submitted', 'processing')")
      .all().map(mapUpload);
  }

  return {
    create,
    findById,
    getDashboardSummary,
    getRecent,
    list,
    listForProcessingResume,
    markCancelled,
    markCompleted,
    markFailed,
    markLocalFileDeleted,
    markPendingSeen,
    markProcessing,
    markSubmitted,
    prepareRetry,
    prepareProcessingCheckRetry,
    setRemoteIds,
    updateTransferProgress,
  };
}
