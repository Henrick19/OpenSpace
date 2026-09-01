import cors from "cors";
import express from "express";

import { createCaptureRepository } from "./repositories/captureRepository.js";
import { createProjectRepository } from "./repositories/projectRepository.js";
import { createCaptureRouter } from "./routes/captureRoutes.js";
import { createDashboardRouter } from "./routes/dashboardRoutes.js";
import { createProjectRouter } from "./routes/projectRoutes.js";

export function createApp({ database, webOrigin = "http://localhost:5173" }) {
  const app = express();
  const captureRepository = createCaptureRepository(database);
  const projectRepository = createProjectRepository(database);

  app.disable("x-powered-by");
  app.use(cors({ origin: webOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok", service: "openspace-api", timestamp: new Date().toISOString() });
  });
  app.use("/api/captures", createCaptureRouter(captureRepository));
  app.use("/api/projects", createProjectRouter(projectRepository));
  app.use("/api/dashboard", createDashboardRouter(captureRepository, projectRepository));

  app.use((error, _request, response, _next) => {
    console.error("Unhandled API error", error);
    response.status(500).json({ message: "The local API service encountered an error." });
  });

  return app;
}
