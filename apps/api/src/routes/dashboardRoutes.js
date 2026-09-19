import { Router } from "express";

/** Creates dashboard read endpoints backed by the upload repository. */
export function createDashboardRouter(uploadRepository) {
  const router = Router();
  // Return the four metric counts and the five newest local upload records.
  router.get("/summary", (_request, response) => {
    response.json({
      ...uploadRepository.getDashboardSummary(),
      recentUploads: uploadRepository.getRecent(5),
    });
  });
  return router;
}
