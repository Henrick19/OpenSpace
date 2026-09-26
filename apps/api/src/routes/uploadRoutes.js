import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { TERMINAL_UPLOAD_STATUSES, UPLOAD_STATUSES } from "@openspace/shared";

const DELETABLE_UPLOAD_STATUSES = new Set(TERMINAL_UPLOAD_STATUSES);

// Validate metadata separately from the binary file received by Multer.
const uploadFieldsSchema = z.object({
  siteId: z.string().trim().min(1),
  sheetId: z.string().trim().min(1),
  captureName: z.string().trim().min(1).max(120),
  deviceId: z.string().trim().min(3).max(200),
  capturedAt: z.iso.datetime({ offset: true }),
});

function removeUploadedFile(file) {
  if (file?.path) fs.rmSync(file.path, { force: true });
}

function cleanFileName(name) {
  return Array.from(path.basename(name))
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("");
}

/**
 * Creates upload/history endpoints and connects them to local storage and the
 * background Upload Coordinator.
 */
export function createUploadRouter({
  uploadRepository,
  projectRepository,
  cameraRepository,
  coordinator,
  environment,
}) {
  // Multer stages one INSV file on disk before the route creates its DB record.
  fs.mkdirSync(environment.uploadDirectory, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, environment.uploadDirectory),
    filename: (_request, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  });
  const receiveUpload = multer({
    storage,
    limits: { fileSize: environment.maxUploadBytes, files: 1 },
    fileFilter: (_request, file, callback) => {
      callback(null, path.extname(file.originalname).toLowerCase() === ".insv");
    },
  }).single("file");

  const router = Router();

  // History list with optional search, status, project, date and page filters.
  router.get("/", (request, response) => {
    response.json(uploadRepository.list({
      search: request.query.search?.trim(),
      status: request.query.status,
      siteId: request.query.siteId,
      from: request.query.from,
      to: request.query.to,
      page: request.query.page,
      pageSize: request.query.pageSize,
    }));
  });

  router.get("/recent", (request, response) => {
    response.json({ items: uploadRepository.getRecent(request.query.limit) });
  });

  router.get("/statuses/values", (_request, response) => response.json({ items: UPLOAD_STATUSES }));

  // Live, sanitized diagnostic view of the capture's current OpenSpace state.
  router.get("/:id/remote-status", async (request, response) => {
    if (!uploadRepository.findById(request.params.id)) {
      return response.status(404).json({ message: "Upload was not found." });
    }
    try {
      return response.json(await coordinator.getRemoteStatus(request.params.id));
    } catch (error) {
      return response.status(502).json({ message: error.message });
    }
  });

  // Progress screen polls this endpoint for the latest local upload state.
  router.get("/:id", (request, response) => {
    const upload = uploadRepository.findById(request.params.id);
    if (!upload) return response.status(404).json({ message: "Upload was not found." });
    return response.json(upload);
  });

  // Remove one terminal record from local history. This never deletes the
  // corresponding capture from OpenSpace, which is outside this integration.
  router.delete("/:id", (request, response, next) => {
    const upload = uploadRepository.findById(request.params.id, {
      includeLocalPath: true,
    });
    if (!upload) {
      return response.status(404).json({ message: "Upload was not found." });
    }
    if (!DELETABLE_UPLOAD_STATUSES.has(upload.status)) {
      return response.status(409).json({
        message: "Only completed, failed or cancelled upload history can be deleted.",
      });
    }

    try {
      removeUploadedFile({ path: upload.localFilePath });
      uploadRepository.deleteById(upload.id);
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", (request, response, next) => {
    receiveUpload(request, response, (uploadError) => {
      if (uploadError) return next(uploadError);
      try {
        if (!request.file) {
          return response.status(400).json({ message: "Select one .insv file." });
        }
        const parsed = uploadFieldsSchema.safeParse(request.body);
        if (!parsed.success) {
          removeUploadedFile(request.file);
          return response.status(400).json({ message: "Upload details are invalid.", issues: parsed.error.issues });
        }
        // Confirm the submitted sheet belongs to an active, approved project.
        const project = projectRepository.findBySiteId(parsed.data.siteId);
        const sheet = projectRepository.findSheet(parsed.data.siteId, parsed.data.sheetId);
        if (!project || project.status !== "active" || !sheet) {
          removeUploadedFile(request.file);
          return response.status(400).json({ message: "The selected project and floor do not match." });
        }
        const camera = cameraRepository.findByDeviceId(parsed.data.deviceId);
        if (!camera || camera.status !== "active") {
          removeUploadedFile(request.file);
          return response.status(400).json({ message: "Select an active camera from the local catalogue." });
        }
        const capturedAt = new Date(parsed.data.capturedAt);
        // Persist metadata and the documented default start before returning 202.
        const upload = uploadRepository.create({
          siteId: project.siteId,
          projectName: project.name,
          sheetId: sheet.sheetId,
          floorName: sheet.name,
          captureName: parsed.data.captureName,
          deviceId: camera.deviceId,
          fileName: cleanFileName(request.file.originalname),
          localFilePath: request.file.path,
          fileSize: request.file.size,
          capturedAt: capturedAt.toISOString(),
          startMicro: Math.round(capturedAt.getTime() * 1000),
          startX: sheet.defaultStartPosition[0],
          startY: sheet.defaultStartPosition[1],
          startZ: sheet.defaultStartPosition[2],
        });
        // The browser receives an ID immediately while remote work continues.
        coordinator.startInBackground(upload.id);
        return response.status(202).json(upload);
      } catch (error) {
        removeUploadedFile(request.file);
        return next(error);
      }
    });
  });

  router.post("/:id/retry", (request, response) => {
    try {
      return response.status(202).json(coordinator.retry(request.params.id));
    } catch (error) {
      return response.status(409).json({ message: error.message });
    }
  });

  router.post("/:id/cancel", (request, response) => {
    try {
      return response.json(coordinator.cancel(request.params.id));
    } catch (error) {
      return response.status(409).json({ message: error.message });
    }
  });

  return router;
}
