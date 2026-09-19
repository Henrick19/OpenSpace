import { describe, expect, it } from "vitest";

import { loadEnvironment } from "./environment.js";

// Configuration tests protect the safe mock default and live-mode secret checks.
describe("loadEnvironment", () => {
  it("defaults to safe mock mode", () => {
    const environment = loadEnvironment({});
    expect(environment.openSpace.mode).toBe("mock");
    expect(environment.openSpace.baseUrl).toBe("https://sgp.openspace.ai");
    expect(environment.openSpace.webUrl).toBe("https://sgp.openspace.ai/login");
  });

  it("rejects live mode without every required credential", () => {
    expect(() => loadEnvironment({ OPENSPACE_MODE: "live" })).toThrow(/OPENSPACE_CLIENT_ID/);
  });
});
