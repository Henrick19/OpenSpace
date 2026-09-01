import { Router } from "express";

export function createProjectRouter(projectRepository) {
  const router = Router();
  router.get("/", (_request, response) => response.json({ items: projectRepository.list() }));
  return router;
}
