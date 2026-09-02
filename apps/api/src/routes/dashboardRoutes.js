import { Router } from "express";

export function createDashboardRouter(uploadRepository) {
  const router = Router();
  router.get("/summary", (_request, response) => {
    response.json({
      ...uploadRepository.getDashboardSummary(),
      recentUploads: uploadRepository.getRecent(5),
    });
  });
  return router;
}
