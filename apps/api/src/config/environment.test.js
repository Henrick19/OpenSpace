import { describe, expect, it } from "vitest";

import { loadEnvironment } from "./environment.js";

describe("environment configuration", () => {
  it("uses safe mock defaults without credentials", () => {
    const environment = loadEnvironment({});
    expect(environment.openSpace.mode).toBe("mock");
    expect(environment.openSpace.clientSecret).toBe("");
  });

  it("refuses live mode when required values are missing", () => {
    expect(() => loadEnvironment({ OPENSPACE_MODE: "live" })).toThrow("Live OpenSpace mode requires");
  });
});
