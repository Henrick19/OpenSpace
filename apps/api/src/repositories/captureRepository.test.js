import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../database/connection.js";
import { createCaptureRepository } from "./captureRepository.js";

let database;
let captures;

beforeEach(() => {
  database = createDatabase(":memory:");
  captures = createCaptureRepository(database);
});

afterEach(() => database.close());

describe("capture repository", () => {
  it("creates, finds and searches a capture record", () => {
    const created = captures.create({
      siteId: "test-site",
      projectName: "Robotics Lab",
      captureName: "Morning inspection",
      fileName: "VID_20260901_090000.insv",
      capturedAt: "2026-09-01T01:00:00.000Z",
    });

    expect(captures.findById(created.id).fileName).toBe("VID_20260901_090000.insv");
    const result = captures.list({ search: "Morning" });
    expect(result.total).toBe(1);
    expect(result.items[0].projectName).toBe("Robotics Lab");
  });

  it("returns dashboard counts", () => {
    captures.create({
      siteId: "test-site",
      projectName: "Robotics Lab",
      captureName: "Trial",
      fileName: "trial.insv",
      status: "processing",
    });

    expect(captures.getDashboardSummary()).toEqual({
      totalCaptures: 1,
      processing: 1,
      ready: 0,
      failed: 0,
    });
  });
});
