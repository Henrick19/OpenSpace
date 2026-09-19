import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../database/connection.js";
import { createUploadRepository } from "../repositories/uploadRepository.js";
import { createUploadCoordinator } from "./uploadCoordinator.js";

function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? {} : { "Content-Type": "application/json" },
  });
}

function createEnvironment(pollTimeoutMs = 80) {
  return {
    openSpace: {
      mode: "live",
      baseUrl: "https://example.invalid",
      webUrl: "https://sgp.openspace.ai/login",
      authUrl: "https://auth.example.invalid/token",
      clientId: "test",
      clientSecret: "test",
      username: "test@example.invalid",
      password: "test",
      pollIntervalMs: 5,
      pollTimeoutMs,
    },
  };
}

function createUpload(repository, localFilePath) {
  return repository.create({
    siteId: "3veiB-IWQeueTCR09xrR6g",
    projectName: "PSB Academy - City Campus",
    sheetId: "ov2OjSjTT-WBP_dgeedIlw",
    floorName: "L3 - Main Wing",
    captureName: "Processing test",
    deviceId: "Insta360 OneX5:sn:TEST",
    fileName: path.basename(localFilePath),
    localFilePath,
    fileSize: fs.statSync(localFilePath).size,
    capturedAt: "2026-09-16T08:00:00.000Z",
    startMicro: 1789545600000000,
    startX: 0,
    startY: 0,
    startZ: 1.5,
  });
}

async function waitForTerminal(repository, id) {
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    const upload = repository.findById(id);
    if (["completed", "failed"].includes(upload.status)) return upload;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Test timed out waiting for a terminal upload state.");
}

afterEach(() => vi.unstubAllGlobals());

describe("upload processing status", () => {
  it("waits until a previously pending capture disappears before completing", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-processing-"));
    const database = createDatabase(":memory:");
    const repository = createUploadRepository(database);
    const filePath = path.join(directory, "capture.insv");
    fs.writeFileSync(filePath, Buffer.alloc(16));
    const upload = createUpload(repository, filePath);
    let layoutCalls = 0;

    vi.stubGlobal("fetch", async (url) => {
      if (String(url).includes("/token")) {
        return jsonResponse({ access_token: "test", expires_in: 3600 });
      }
      if (String(url).includes("/layout2")) {
        layoutCalls += 1;
        const captureId = repository.findById(upload.id).captureId;
        return jsonResponse({
          pendingCaptures: layoutCalls === 2 ? [{ clientCaptureId: captureId }] : [],
        });
      }
      return jsonResponse(null, 204);
    });

    createUploadCoordinator({
      uploadRepository: repository,
      environment: createEnvironment(),
    }).startInBackground(upload.id);

    const result = await waitForTerminal(repository, upload.id);
    expect(result.status).toBe("completed");
    expect(result.pendingSeen).toBe(true);
    expect(layoutCalls).toBeGreaterThanOrEqual(3);
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("fails with an unconfirmed status instead of remaining stuck after timeout", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-processing-"));
    const database = createDatabase(":memory:");
    const repository = createUploadRepository(database);
    const filePath = path.join(directory, "capture.insv");
    fs.writeFileSync(filePath, Buffer.alloc(16));
    const upload = createUpload(repository, filePath);

    vi.stubGlobal("fetch", async (url) => {
      if (String(url).includes("/token")) {
        return jsonResponse({ access_token: "test", expires_in: 3600 });
      }
      if (String(url).includes("/layout2")) return jsonResponse({ pendingCaptures: [] });
      return jsonResponse(null, 204);
    });

    createUploadCoordinator({
      uploadRepository: repository,
      environment: createEnvironment(30),
    }).startInBackground(upload.id);

    const result = await waitForTerminal(repository, upload.id);
    expect(result.status).toBe("failed");
    expect(result.pendingSeen).toBe(false);
    expect(result.errorMessage).toMatch(/could not be confirmed/i);
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
