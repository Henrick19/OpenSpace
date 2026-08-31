import cors from "cors";
import express from "express";

import type { HealthResponse } from "@openspace/shared";

export function createApp() {
  const app = express();
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

  app.disable("x-powered-by");
  app.use(cors({ origin: webOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    const body: HealthResponse = {
      status: "ok",
      service: "openspace-api",
      timestamp: new Date().toISOString(),
    };

    response.status(200).json(body);
  });

  return app;
}
