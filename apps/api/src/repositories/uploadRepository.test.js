import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../database/connection.js";
import { createUploadRepository } from "./uploadRepository.js";

let database;
let uploads;

beforeEach(() => {
  database = createDatabase(":memory:");
  uploads = createUploadRepository(database);
});

afterEach(() => database.close());

function createExample(overrides = {}) {
  return uploads.create({
    siteId: "site-1",
    projectName: "Robotics Lab",
    sheetId: "sheet-2",
    floorName: "Level 02",
    uploadName: "Morning inspection",
    fileName: "morning.insv",
    capturedAt: "2026-09-01T01:00:00.000Z",
    ...overrides,
  });
}

describe("upload repository", () => {
  it("creates and lists an upload from form data", () => {
    const created = createExample();

    expect(created.status).toBe("uploading");
    expect(uploads.findById(created.id).projectName).toBe("Robotics Lab");
    expect(uploads.list({ search: "morning" }).total).toBe(1);
  });

  it("returns dashboard counts and recent uploads", () => {
    const completed = createExample({ uploadName: "Completed", fileName: "done.insv" });
    uploads.markCompleted(completed.id);
    const failed = createExample({ uploadName: "Failed", fileName: "failed.insv" });
    uploads.markFailed(failed.id, "Network error");
    createExample({ uploadName: "Active", fileName: "active.insv" });

    expect(uploads.getDashboardSummary()).toEqual({
      totalUploads: 3,
      inProgress: 1,
      completed: 1,
      failed: 1,
    });
    expect(uploads.getRecent(2)).toHaveLength(2);
  });

  it("updates progress and retries a failed upload", () => {
    const upload = createExample();
    expect(uploads.updateProgress(upload.id, 68).uploadProgress).toBe(68);

    uploads.markFailed(upload.id, "Connection interrupted");
    const retried = uploads.retry(upload.id);
    expect(retried.status).toBe("uploading");
    expect(retried.uploadProgress).toBe(0);
    expect(retried.retryCount).toBe(1);
    expect(retried.errorMessage).toBeNull();
  });
});
