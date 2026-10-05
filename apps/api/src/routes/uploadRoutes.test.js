import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createDatabase } from "../database/connection.js";
import { createUploadRepository } from "../repositories/uploadRepository.js";

const cleanups = [];

function createEnvironment(uploadDirectory) {
  return {
    webOrigin: "http://localhost:5173",
    uploadDirectory,
    maxUploadBytes: 1024 * 1024,
    defaultDeviceId: "Insta360 OneX5:sn:TEST",
    openSpace: {
      mode: "mock",
      webUrl: "https://sgp.openspace.ai/login",
      mockStepDelayMs: 1,
      mockProcessingDelayMs: 1,
    },
  };
}

function createUpload(repository, localFilePath) {
  return repository.create({
    siteId: "3veiB-IWQeueTCR09xrR6g",
    projectName: "PSB Academy - City Campus",
    sheetId: "ov2OjSjTT-WBP_dgeedIlw",
    floorName: "L3 - Main Wing",
    captureName: "Deletion test",
    deviceId: "Insta360 OneX5:sn:TEST",
    fileName: path.basename(localFilePath),
    localFilePath,
    fileSize: fs.statSync(localFilePath).size,
    capturedAt: "2026-09-23T08:00:00.000Z",
    startMicro: 1790150400000000,
    startX: 0,
    startY: 0,
    startZ: 1.5,
  });
}

async function startTestServer(database, environment) {
  const { app } = createApp({ database, environment });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

describe("DELETE /api/uploads/:id", () => {
  it("deletes a terminal SQLite record and its retained local file", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-delete-"));
    cleanups.push(() => fs.promises.rm(directory, { recursive: true, force: true }));
    const database = createDatabase(":memory:");
    cleanups.push(() => database.close());
    const repository = createUploadRepository(database);
    const filePath = path.join(directory, "capture.insv");
    fs.writeFileSync(filePath, Buffer.alloc(16));
    const upload = createUpload(repository, filePath);
    repository.markFailed(upload.id, "Test failure");
    const baseUrl = await startTestServer(database, createEnvironment(directory));

    const response = await fetch(`${baseUrl}/api/uploads/${upload.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(repository.findById(upload.id)).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("rejects deletion while an upload is active", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-delete-"));
    cleanups.push(() => fs.promises.rm(directory, { recursive: true, force: true }));
    const database = createDatabase(":memory:");
    cleanups.push(() => database.close());
    const repository = createUploadRepository(database);
    const filePath = path.join(directory, "capture.insv");
    fs.writeFileSync(filePath, Buffer.alloc(16));
    const upload = createUpload(repository, filePath);
    const baseUrl = await startTestServer(database, createEnvironment(directory));

    const response = await fetch(`${baseUrl}/api/uploads/${upload.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "Only completed, failed or cancelled upload history can be deleted.",
    });
    expect(repository.findById(upload.id)).not.toBeNull();
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe("POST /api/uploads duplicate protection", () => {
  it("rejects the same INSV bytes even when the filename and capture time change", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-duplicate-"));
    cleanups.push(() => fs.promises.rm(directory, { recursive: true, force: true }));
    const database = createDatabase(":memory:");
    cleanups.push(() => database.close());
    const repository = createUploadRepository(database);
    const content = Buffer.from("same-insv-binary-content");
    const originalPath = path.join(directory, "original.insv");
    fs.writeFileSync(originalPath, content);
    const original = repository.create({
      siteId: "3veiB-IWQeueTCR09xrR6g",
      projectName: "PSB Academy - City Campus",
      sheetId: "ov2OjSjTT-WBP_dgeedIlw",
      floorName: "L3 - Main Wing",
      captureName: "Original capture",
      deviceId: "Insta360 OneX5:sn:TEST",
      fileName: "original.insv",
      contentSha256: createHash("sha256").update(content).digest("hex"),
      localFilePath: originalPath,
      fileSize: content.length,
      capturedAt: "2026-09-23T08:00:00.000Z",
      startMicro: 1790150400000000,
      startX: 0,
      startY: 0,
      startZ: 1.5,
    });
    const baseUrl = await startTestServer(database, createEnvironment(directory));
    const form = new FormData();
    form.append("siteId", "3veiB-IWQeueTCR09xrR6g");
    form.append("sheetId", "ov2OjSjTT-WBP_dgeedIlw");
    form.append("captureName", "Changed capture name");
    form.append("deviceId", "Insta360 OneX5:sn:TEST");
    form.append("capturedAt", "2026-10-05T02:25:00.000Z");
    form.append("file", new Blob([content], { type: "video/insv" }), "renamed.insv");

    const response = await fetch(`${baseUrl}/api/uploads`, { method: "POST", body: form });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: `This INSV file was already uploaded as ${original.id} (staged). Open the existing upload instead of submitting it again.`,
      duplicateUploadId: original.id,
      duplicateStatus: "staged",
    });
    expect(repository.list().total).toBe(1);
    expect(fs.readdirSync(directory)).toEqual(["original.insv"]);
  });

  it("recognizes a legacy duplicate by device, original filename and file size", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "openspace-legacy-duplicate-"));
    cleanups.push(() => fs.promises.rm(directory, { recursive: true, force: true }));
    const database = createDatabase(":memory:");
    cleanups.push(() => database.close());
    const repository = createUploadRepository(database);
    const content = Buffer.from("legacy-insv-content");
    const originalPath = path.join(directory, "capture.insv");
    fs.writeFileSync(originalPath, content);
    const original = createUpload(repository, originalPath);
    const baseUrl = await startTestServer(database, createEnvironment(directory));
    const form = new FormData();
    form.append("siteId", "3veiB-IWQeueTCR09xrR6g");
    form.append("sheetId", "ov2OjSjTT-WBP_dgeedIlw");
    form.append("captureName", "Changed legacy capture");
    form.append("deviceId", "Insta360 OneX5:sn:TEST");
    form.append("capturedAt", "2026-10-05T02:25:00.000Z");
    form.append("file", new Blob([content], { type: "video/insv" }), "capture.insv");

    const response = await fetch(`${baseUrl}/api/uploads`, { method: "POST", body: form });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.duplicateUploadId).toBe(original.id);
    expect(repository.list().total).toBe(1);
  });
});
