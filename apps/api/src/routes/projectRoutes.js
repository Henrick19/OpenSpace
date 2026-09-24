import { Router } from "express";
import { z } from "zod";

const sheetSchema = z.object({
  sheetId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(120),
});

const projectSchema = z.object({
  siteId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(120),
  firstSheet: sheetSchema.nullish(),
});

/** Creates project-catalogue endpoints for frontend dropdowns. */
export function createProjectRouter(projectRepository) {
  const router = Router();
  // Projects and sheets come from PSB's local SQLite catalogue.
  router.get("/", (_request, response) => response.json({ items: projectRepository.list() }));

  // Create a local project and, optionally, its first floor/sheet in one transaction.
  router.post("/", (request, response) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ message: "Project details are invalid.", issues: parsed.error.issues });
    }
    if (projectRepository.findBySiteId(parsed.data.siteId)) {
      return response.status(409).json({ message: "A project with this site ID already exists." });
    }
    if (parsed.data.firstSheet && projectRepository.findSheetById(parsed.data.firstSheet.sheetId)) {
      return response.status(409).json({ message: "A floor with this sheet ID already exists." });
    }
    const project = projectRepository.createProjectWithOptionalSheet(
      {
        siteId: parsed.data.siteId,
        name: parsed.data.name,
      },
      parsed.data.firstSheet ?? null,
    );
    return response.status(201).json(project);
  });

  // Add one approved OpenSpace floor/sheet ID to an existing local project.
  router.post("/:siteId/sheets", (request, response) => {
    const project = projectRepository.findBySiteId(request.params.siteId);
    if (!project) return response.status(404).json({ message: "Project was not found." });
    const parsed = sheetSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ message: "Floor details are invalid.", issues: parsed.error.issues });
    }
    if (projectRepository.findSheetById(parsed.data.sheetId)) {
      return response.status(409).json({ message: "A floor with this sheet ID already exists." });
    }
    const sheet = projectRepository.upsertSheet({
      ...parsed.data,
      siteId: project.siteId,
      defaultStartPosition: [0, 0, 1.5],
    });
    return response.status(201).json(sheet);
  });

  return router;
}
