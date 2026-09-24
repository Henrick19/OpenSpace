import { describe, expect, it } from "vitest";

import { OPENAPI_DOCUMENT } from "./document.js";

describe("PSB backend OpenAPI document", () => {
  it("documents every public MVP backend path", () => {
    expect(Object.keys(OPENAPI_DOCUMENT.paths).sort()).toEqual([
      "/api/config",
      "/api/dashboard/summary",
      "/api/health",
      "/api/projects",
      "/api/projects/{siteId}/sheets",
      "/api/uploads",
      "/api/uploads/recent",
      "/api/uploads/statuses/values",
      "/api/uploads/{id}",
      "/api/uploads/{id}/cancel",
      "/api/uploads/{id}/remote-status",
      "/api/uploads/{id}/retry",
    ].sort());
  });

  it("does not expose private OpenSpace paths or credential fields", () => {
    const serialized = JSON.stringify(OPENAPI_DOCUMENT).toLowerCase();
    expect(serialized).not.toContain("/api/upcap");
    expect(serialized).not.toContain("layout2");
    expect(serialized).not.toContain("client_secret");
    expect(serialized).not.toContain("clientsecret");
    expect(serialized).not.toContain("openspace_password");
  });

  it("documents local-only upload history deletion", () => {
    const deleteOperation = OPENAPI_DOCUMENT.paths["/api/uploads/{id}"].delete;
    expect(deleteOperation.operationId).toBe("deleteUploadHistory");
    expect(deleteOperation.description).toMatch(/local SQLite database/i);
    expect(deleteOperation.description).toMatch(/does not delete.*OpenSpace/i);
    expect(deleteOperation.responses[204]).toBeDefined();
    expect(deleteOperation.responses[409]).toBeDefined();
  });
});
