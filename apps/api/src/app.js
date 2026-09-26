import cors from "cors";
import express from "express";
import multer from "multer";
import swaggerUi from "swagger-ui-express";

import { OPENAPI_DOCUMENT } from "./openapi/document.js";
import { createCameraRepository } from "./repositories/cameraRepository.js";
import { createProjectRepository } from "./repositories/projectRepository.js";
import { createUploadRepository } from "./repositories/uploadRepository.js";
import { createDashboardRouter } from "./routes/dashboardRoutes.js";
import { createCameraRouter } from "./routes/cameraRoutes.js";
import { createProjectRouter } from "./routes/projectRoutes.js";
import { createUploadRouter } from "./routes/uploadRoutes.js";
import { createUploadCoordinator } from "./services/uploadCoordinator.js";

/**
 * Builds the Express application and connects its routes to shared repositories.
 * The caller owns the database lifecycle; this function only wires dependencies.
 *
 * @param {{ database: import("better-sqlite3").Database, environment: object }} dependencies
 * @returns {{ app: import("express").Express, coordinator: object }}
 */
export function createApp({ database, environment }) {
  const app = express();
  const cameraRepository = createCameraRepository(database);
  const projectRepository = createProjectRepository(database);
  const uploadRepository = createUploadRepository(database);
  const coordinator = createUploadCoordinator({ uploadRepository, environment });
  cameraRepository.ensureDefault(environment.defaultDeviceId);

  // Apply common security, cross-origin and JSON parsing rules before any route.
  app.disable("x-powered-by");
  app.use(cors({ origin: environment.webOrigin }));
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  // Lightweight endpoints used by the frontend and local health checks.
  app.get("/api/health", (_request, response) => response.json({
    status: "ok",
    mode: environment.openSpace.mode,
    timestamp: new Date().toISOString(),
  }));
  app.get("/api/config", (_request, response) => response.json({
    openSpaceMode: environment.openSpace.mode,
    defaultDeviceId: environment.defaultDeviceId,
    maximumUploadBytes: environment.maxUploadBytes,
  }));
  // Interactive documentation for PSB's own backend API. Private OpenSpace
  // endpoints and credentials are deliberately absent from this document.
  app.get("/api/docs/openapi.json", (_request, response) => response.json(OPENAPI_DOCUMENT));
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(OPENAPI_DOCUMENT, {
      customSiteTitle: "PSB OpenSpace API Documentation",
      swaggerOptions: {
        displayRequestDuration: true,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
      },
    }),
  );
  // Feature routers receive only the dependencies they are allowed to use.
  app.use("/api/cameras", createCameraRouter(cameraRepository));
  app.use("/api/projects", createProjectRouter(projectRepository));
  app.use("/api/dashboard", createDashboardRouter(uploadRepository));
  app.use("/api/uploads", createUploadRouter({
    uploadRepository,
    projectRepository,
    cameraRepository,
    coordinator,
    environment,
  }));

  // Final error boundary: convert backend failures into safe JSON responses.
  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "The selected INSV file exceeds the configured local size limit."
        : "The local upload could not be received.";
      return response.status(400).json({ message });
    }
    console.error("Local API error:", error instanceof Error ? error.message : "Unknown error");
    return response.status(500).json({ message: "The local API service encountered an error." });
  });

  return { app, coordinator };
}
