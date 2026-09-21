import { Router } from "express";

/** Creates project-catalogue endpoints for frontend dropdowns. */
export function createProjectRouter(projectRepository) {
  const router = Router();
  // Projects and sheets come from PSB's local SQLite catalogue.
  router.get("/", (_request, response) => response.json({ items: projectRepository.list() }));
  return router;
}
