import { Router } from "express";
import { z } from "zod";

const cameraSchema = z.object({
  deviceId: z.string().trim().min(6).max(200).regex(/^.+:sn:.+$/, "Use CameraType:sn:SerialNumber."),
  displayName: z.string().trim().min(1).max(120),
});

/** Creates local camera-catalogue endpoints used by the upload dropdown. */
export function createCameraRouter(cameraRepository) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json({ items: cameraRepository.list() });
  });

  router.post("/", (request, response) => {
    const parsed = cameraSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ message: "Camera details are invalid.", issues: parsed.error.issues });
    }
    if (cameraRepository.findByDeviceId(parsed.data.deviceId)) {
      return response.status(409).json({ message: "A camera with this device ID already exists." });
    }
    return response.status(201).json(cameraRepository.create(parsed.data));
  });

  router.patch("/:deviceId", (request, response) => {
    const parsed = cameraSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ message: "Camera details are invalid.", issues: parsed.error.issues });
    }
    try {
      return response.json(cameraRepository.update(request.params.deviceId, parsed.data));
    } catch (error) {
      const missing = error.message === "Camera was not found.";
      return response.status(missing ? 404 : 409).json({ message: error.message });
    }
  });

  return router;
}
