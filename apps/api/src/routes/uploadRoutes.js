import { Router } from "express";
import { z } from "zod";

import { UPLOAD_STATUSES } from "@openspace/shared";

const optionalDate = z.iso.datetime({ offset: true }).optional().nullable();
const createUploadSchema = z.object({
  siteId: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  sheetId: z.string().trim().min(1).optional().nullable(),
  floorName: z.string().trim().min(1).optional().nullable(),
  uploadName: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  capturedAt: optionalDate,
  startPoint: z.object({ x: z.number(), y: z.number() }).optional().nullable(),
  status: z.enum(UPLOAD_STATUSES).optional(),
});

function handleRepositoryError(error, response) {
  const status = error.message === "Upload was not found." ? 404 : 409;
  return response.status(status).json({ message: error.message });
}

export function createUploadRouter(uploadRepository) {
  const router = Router();

  router.get("/", (request, response) => {
    response.json(uploadRepository.list({
      search: request.query.search?.trim(),
      status: request.query.status,
      siteId: request.query.siteId,
      from: request.query.from,
      to: request.query.to,
      page: Number.parseInt(request.query.page ?? "1", 10),
      pageSize: Number.parseInt(request.query.pageSize ?? "20", 10),
    }));
  });

  router.get("/recent", (request, response) => {
    const limit = Number.parseInt(request.query.limit ?? "5", 10);
    response.json({ items: uploadRepository.getRecent(Number.isNaN(limit) ? 5 : limit) });
  });

  router.get("/:id", (request, response) => {
    const upload = uploadRepository.findById(request.params.id);
    if (!upload) return response.status(404).json({ message: "Upload was not found." });
    return response.json(upload);
  });

  router.post("/", (request, response) => {
    const result = createUploadSchema.safeParse(request.body);
    if (!result.success) {
      return response.status(400).json({ message: "Upload details are invalid.", issues: result.error.issues });
    }
    return response.status(201).json(uploadRepository.create(result.data));
  });

  router.patch("/:id/progress", (request, response) => {
    const result = z.object({ progress: z.number().int().min(0).max(100) }).safeParse(request.body);
    if (!result.success) return response.status(400).json({ message: "Progress must be between 0 and 100." });
    try {
      return response.json(uploadRepository.updateProgress(request.params.id, result.data.progress));
    } catch (error) {
      return handleRepositoryError(error, response);
    }
  });

  router.post("/:id/retry", (request, response) => {
    try {
      return response.json(uploadRepository.retry(request.params.id));
    } catch (error) {
      return handleRepositoryError(error, response);
    }
  });

  router.post("/:id/complete", (request, response) => {
    const result = z.object({
      openSpaceCaptureId: z.string().trim().min(1).optional().nullable(),
      viewerUrl: z.string().url().optional().nullable(),
    }).safeParse(request.body ?? {});
    if (!result.success) return response.status(400).json({ message: "Completion details are invalid." });
    try {
      return response.json(uploadRepository.markCompleted(request.params.id, result.data));
    } catch (error) {
      return handleRepositoryError(error, response);
    }
  });

  router.post("/:id/fail", (request, response) => {
    const result = z.object({ errorMessage: z.string().trim().min(1) }).safeParse(request.body);
    if (!result.success) return response.status(400).json({ message: "An error message is required." });
    try {
      return response.json(uploadRepository.markFailed(request.params.id, result.data.errorMessage));
    } catch (error) {
      return handleRepositoryError(error, response);
    }
  });

  return router;
}
