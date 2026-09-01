import { Router } from "express";

export function createDashboardRouter(captureRepository, projectRepository) {
  const router = Router();
  router.get("/summary", (_request, response) => {
    response.json({
      activeProjects: projectRepository.count(),
      ...captureRepository.getDashboardSummary(),
    });
  });
  return router;
}
