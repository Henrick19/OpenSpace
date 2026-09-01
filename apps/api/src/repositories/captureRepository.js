import { randomUUID } from "node:crypto";

import { DEFAULT_PAGE_SIZE } from "@openspace/shared";

function mapCapture(row) {
  if (!row) return null;

  return {
    id: row.id,
    openSpaceCaptureId: row.openspace_capture_id,
    siteId: row.site_id,
    projectName: row.project_name,
    sheetId: row.sheet_id,
    floorName: row.floor_name,
    captureName: row.capture_name,
    fileName: row.file_name,
    fileSize: row.file_size,
    capturedAt: row.captured_at,
    startPoint: row.start_x == null || row.start_y == null ? null : { x: row.start_x, y: row.start_y },
    status: row.status,
    uploadProgress: row.upload_progress,
    uploadStartedAt: row.upload_started_at,
    uploadCompletedAt: row.upload_completed_at,
    submittedAt: row.submitted_at,
    processingCompletedAt: row.processing_completed_at,
    viewerUrl: row.viewer_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCaptureRepository(database) {
  const insertCapture = database.prepare(`
    INSERT INTO captures (
      id, site_id, project_name, sheet_id, floor_name, capture_name,
      file_name, file_size, local_file_path, captured_at, start_x, start_y,
      status, created_at, updated_at
    ) VALUES (
      @id, @siteId, @projectName, @sheetId, @floorName, @captureName,
      @fileName, @fileSize, @localFilePath, @capturedAt, @startX, @startY,
      @status, @createdAt, @updatedAt
    )
  `);

  const insertEvent = database.prepare(`
    INSERT INTO capture_events (capture_id, stage, message, progress, created_at)
    VALUES (@captureId, @stage, @message, @progress, @createdAt)
  `);

  const create = database.transaction((input) => {
    const now = new Date().toISOString();
    const capture = {
      id: randomUUID(),
      siteId: input.siteId,
      projectName: input.projectName,
      sheetId: input.sheetId ?? null,
      floorName: input.floorName ?? null,
      captureName: input.captureName,
      fileName: input.fileName,
      fileSize: input.fileSize ?? null,
      localFilePath: input.localFilePath ?? null,
      capturedAt: input.capturedAt ?? null,
      startX: input.startPoint?.x ?? null,
      startY: input.startPoint?.y ?? null,
      status: input.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    };

    insertCapture.run(capture);
    insertEvent.run({
      captureId: capture.id,
      stage: capture.status,
      message: "Capture record created.",
      progress: 0,
      createdAt: now,
    });

    return findById(capture.id);
  });

  function findById(id) {
    return mapCapture(database.prepare("SELECT * FROM captures WHERE id = ?").get(id));
  }

  function list(filters = {}) {
    const conditions = [];
    const parameters = {};

    if (filters.search) {
      conditions.push(`(
        capture_name LIKE @search OR file_name LIKE @search OR
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

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    parameters.limit = pageSize;
    parameters.offset = (page - 1) * pageSize;

    const rows = database.prepare(`
      SELECT * FROM captures
      ${whereClause}
      ORDER BY COALESCE(captured_at, created_at) DESC
      LIMIT @limit OFFSET @offset
    `).all(parameters);
    const count = database.prepare(`SELECT COUNT(*) AS total FROM captures ${whereClause}`).get(parameters);

    return { items: rows.map(mapCapture), page, pageSize, total: count.total };
  }

  function getDashboardSummary() {
    const row = database.prepare(`
      SELECT
        COUNT(*) AS total_captures,
        SUM(CASE WHEN status IN ('uploading', 'submitted', 'processing') THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM captures
    `).get();

    return {
      totalCaptures: row.total_captures,
      processing: row.processing ?? 0,
      ready: row.ready ?? 0,
      failed: row.failed ?? 0,
    };
  }

  return { create, findById, getDashboardSummary, list };
}
