import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createDatabase } from "../database/connection.js";

const cleanups = [];

function createEnvironment() {
  return {
    webOrigin: "http://localhost:5173",
    uploadDirectory: os.tmpdir(),
    maxUploadBytes: 1024,
    defaultDeviceId: "Insta360 X5:sn:DEFAULT_TEST",
    openSpace: {
      mode: "mock",
      webUrl: "https://sgp.openspace.ai/login",
      mockStepDelayMs: 1,
      mockProcessingDelayMs: 1,
    },
  };
}

async function startServer() {
  const database = createDatabase(":memory:");
  const { app } = createApp({ database, environment: createEnvironment() });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  cleanups.push(() => new Promise((resolve) => server.close(() => {
    database.close();
    resolve();
  })));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

describe("camera catalogue routes", () => {
  it("imports the configured default camera and lists it", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/api/cameras`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([
      expect.objectContaining({
        deviceId: "Insta360 X5:sn:DEFAULT_TEST",
        model: "Insta360 X5",
        serialNumber: "DEFAULT_TEST",
        status: "active",
      }),
    ]);
  });

  it("adds a second camera and rejects duplicate device IDs", async () => {
    const baseUrl = await startServer();
    const camera = {
      deviceId: "Insta360 XS:sn:SECOND_TEST",
      displayName: "Insta360 XS – Test camera",
    };
    const first = await fetch(`${baseUrl}/api/cameras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(camera),
    });
    const duplicate = await fetch(`${baseUrl}/api/cameras`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(camera),
    });

    expect(first.status).toBe(201);
    expect(await first.json()).toEqual(expect.objectContaining(camera));
    expect(duplicate.status).toBe(409);
  });
});
