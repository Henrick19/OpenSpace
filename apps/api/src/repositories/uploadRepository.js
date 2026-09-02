import { randomUUID } from "node:crypto";

import { DEFAULT_PAGE_SIZE } from "@openspace/shared";

function mapUpload(row) {
  if (!row) return null;

  return {
    id: row.id,
    openSpaceCaptureId: row.openspace_capture_id,
    siteId: row.site_id,
    projectName: row.project_name,
    sheetId: row.sheet_id,
    floorName: row.floor_name,
    uploadName: row.upload_name,
    fileName: row.file_name,
    fileSize: row.file_size,
    capturedAt: row.captured_at,
    startPoint: row.start_x == null || row.start_y == null
      ? null
      : { x: row.start_x, y: row.start_y },
    status: row.status,
    uploadProgress: row.upload_progress,
    retryCount: row.retry_count,
    uploadStartedAt: row.upload_started_at,
    uploadCompletedAt: row.upload_completed_at,
    viewerUrl: row.viewer_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createUploadRepository(database) {
  const insertUpload = database.prepare(`
    INSERT INTO uploads (
      id, site_id, project_name, sheet_id, floor_name, upload_name,
      file_name, file_size, captured_at, start_x, start_y, status,
      upload_progress, upload_started_at, created_at, updated_at
    ) VALUES (
      @id, @siteId, @projectName, @sheetId, @floorName, @uploadName,
      @fileName, @fileSize, @capturedAt, @startX, @startY, @status,
      @uploadProgress, @uploadStartedAt, @createdAt, @updatedAt
    )
  `);

  function findById(id) {
    return mapUpload(database.prepare("SELECT * FROM uploads WHERE id = ?").get(id));
  }

  function requireUpload(id) {
    const upload = findById(id);
    if (!upload) throw new Error("Upload was not found.");
    return upload;
  }

  function create(input) {
    const now = new Date().toISOString();
    const upload = {
      id: randomUUID(),
      siteId: input.siteId,
      projectName: input.projectName,
      sheetId: input.sheetId ?? null,
      floorName: input.floorName ?? null,
      uploadName: input.uploadName,
      fileName: input.fileName,
      fileSize: input.fileSize ?? null,
      capturedAt: input.capturedAt ?? null,
      startX: input.startPoint?.x ?? null,
      startY: input.startPoint?.y ?? null,
      status: input.status ?? "uploading",
      uploadProgress: input.uploadProgress ?? 0,
      uploadStartedAt: input.status === "pending" ? null : now,
      createdAt: now,
      updatedAt: now,
    };

    insertUpload.run(upload);
    return findById(upload.id);
  }

  function list(filters = {}) {
    const conditions = [];
    const parameters = {};

    if (filters.search) {
      conditions.push(`(
        upload_name LIKE @search OR file_name LIKE @search OR
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
      conditions.push("COALESCE(captured_at, created_at) >= @from");
      parameters.from = filters.from;
    }
    if (filters.to) {
      conditions.push("COALESCE(captured_at, created_at) <= @to");
      parameters.to = filters.to;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    parameters.limit = pageSize;
    parameters.offset = (page - 1) * pageSize;

    const rows = database.prepare(`
      SELECT * FROM uploads
      ${whereClause}
      ORDER BY COALESCE(captured_at, created_at) DESC
      LIMIT @limit OFFSET @offset
    `).all(parameters);
    const count = database
      .prepare(`SELECT COUNT(*) AS total FROM uploads ${whereClause}`)
      .get(parameters);

    return { items: rows.map(mapUpload), page, pageSize, total: count.total };
  }

  function getRecent(limit = 5) {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    return database.prepare(`
      SELECT * FROM uploads
      ORDER BY COALESCE(captured_at, created_at) DESC
      LIMIT ?
    `).all(safeLimit).map(mapUpload);
  }

  function getDashboardSummary() {
    const row = database.prepare(`
      SELECT
        COUNT(*) AS total_uploads,
        SUM(CASE WHEN status IN ('pending', 'uploading') THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM uploads
    `).get();

    return {
      totalUploads: row.total_uploads,
      inProgress: row.in_progress ?? 0,
      completed: row.completed ?? 0,
      failed: row.failed ?? 0,
    };
  }

  function updateProgress(id, progress) {
    const upload = requireUpload(id);
    if (!["pending", "uploading"].includes(upload.status)) {
      throw new Error("Only an active upload can report progress.");
    }

    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads
      SET status = 'uploading', upload_progress = @progress,
          upload_started_at = COALESCE(upload_started_at, @now), updated_at = @now
      WHERE id = @id
    `).run({ id, progress, now });
    return findById(id);
  }

  function markCompleted(id, details = {}) {
    requireUpload(id);
    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads
      SET status = 'completed', upload_progress = 100,
          openspace_capture_id = COALESCE(@openSpaceCaptureId, openspace_capture_id),
          viewer_url = COALESCE(@viewerUrl, viewer_url),
          error_message = NULL, upload_completed_at = @now, updated_at = @now
      WHERE id = @id
    `).run({
      id,
      openSpaceCaptureId: details.openSpaceCaptureId ?? null,
      viewerUrl: details.viewerUrl ?? null,
      now,
    });
    return findById(id);
  }

  function markFailed(id, errorMessage) {
    requireUpload(id);
    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads
      SET status = 'failed', error_message = @errorMessage, updated_at = @now
      WHERE id = @id
    `).run({ id, errorMessage, now });
    return findById(id);
  }

  function retry(id) {
    const upload = requireUpload(id);
    if (!["failed", "cancelled"].includes(upload.status)) {
      throw new Error("Only a failed or cancelled upload can be retried.");
    }

    const now = new Date().toISOString();
    database.prepare(`
      UPDATE uploads
      SET status = 'uploading', upload_progress = 0, retry_count = retry_count + 1,
          error_message = NULL, upload_started_at = @now,
          upload_completed_at = NULL, updated_at = @now
      WHERE id = @id
    `).run({ id, now });
    return findById(id);
  }

  return {
    create,
    findById,
    getDashboardSummary,
    getRecent,
    list,
    markCompleted,
    markFailed,
    retry,
    updateProgress,
  };
}
