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
    defaultDeviceId: "Insta360 X5:sn:TEST",
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

describe("project catalogue routes", () => {
  it("creates a project and its first floor together", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: "new-site-id",
        name: "New Campus",
        firstSheet: { sheetId: "new-sheet-id", name: "L1 - Main Wing" },
      }),
    });

    expect(response.status).toBe(201);
    const project = await response.json();
    expect(project.siteId).toBe("new-site-id");
    expect(project.canUpload).toBe(true);
    expect(project.sheets).toEqual([
      expect.objectContaining({ sheetId: "new-sheet-id", name: "L1 - Main Wing" }),
    ]);
  });

  it("adds a floor to an existing project with the default position", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/api/projects/0kv8zyqITsaTLTk3DDFaUQ/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId: "robotics-lab-sheet", name: "Robotics Lab" }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(expect.objectContaining({
      sheetId: "robotics-lab-sheet",
      siteId: "0kv8zyqITsaTLTk3DDFaUQ",
      defaultStartPosition: [0, 0, 1.5],
    }));
  });

  it("rejects duplicate project and sheet IDs", async () => {
    const baseUrl = await startServer();
    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: "3veiB-IWQeueTCR09xrR6g", name: "Duplicate" }),
    });
    const sheetResponse = await fetch(`${baseUrl}/api/projects/0kv8zyqITsaTLTk3DDFaUQ/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId: "ov2OjSjTT-WBP_dgeedIlw", name: "Duplicate" }),
    });

    expect(projectResponse.status).toBe(409);
    expect(sheetResponse.status).toBe(409);
  });
});
