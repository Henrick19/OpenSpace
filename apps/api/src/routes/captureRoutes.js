import { Router } from "express";
import { z } from "zod";

import { CAPTURE_STATUSES } from "@openspace/shared";

const optionalDate = z.iso.datetime({ offset: true }).optional().nullable();
const createCaptureSchema = z.object({
  siteId: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  sheetId: z.string().trim().min(1).optional().nullable(),
  floorName: z.string().trim().min(1).optional().nullable(),
  captureName: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  capturedAt: optionalDate,
  startPoint: z.object({ x: z.number(), y: z.number() }).optional().nullable(),
  status: z.enum(CAPTURE_STATUSES).optional(),
});

export function createCaptureRouter(captureRepository) {
  const router = Router();

  router.get("/", (request, response) => {
    const filters = {
      search: request.query.search?.trim(),
      status: request.query.status,
      siteId: request.query.siteId,
      from: request.query.from,
      to: request.query.to,
      page: Number.parseInt(request.query.page ?? "1", 10),
      pageSize: Number.parseInt(request.query.pageSize ?? "20", 10),
    };
    response.json(captureRepository.list(filters));
  });

  router.get("/:id", (request, response) => {
    const capture = captureRepository.findById(request.params.id);
    if (!capture) return response.status(404).json({ message: "Capture was not found." });
    return response.json(capture);
  });

  router.post("/", (request, response) => {
    const result = createCaptureSchema.safeParse(request.body);
    if (!result.success) {
      return response.status(400).json({ message: "Capture details are invalid.", issues: result.error.issues });
    }
    return response.status(201).json(captureRepository.create(result.data));
  });

  return router;
}
