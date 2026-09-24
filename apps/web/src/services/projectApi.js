import { apiRequest } from "./apiClient.js";

/** Local PSB project and sheet catalogue used by upload dropdowns. */
export const projectApi = {
  async list() {
    const result = await apiRequest("/projects");
    return result.items;
  },
  create(project) {
    return apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
  },
  addSheet(siteId, sheet) {
    return apiRequest(`/projects/${encodeURIComponent(siteId)}/sheets`, {
      method: "POST",
      body: JSON.stringify(sheet),
    });
  },
};
