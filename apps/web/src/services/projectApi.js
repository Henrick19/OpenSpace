import { apiRequest } from "./apiClient.js";

/** Local PSB project and sheet catalogue used by upload dropdowns. */
export const projectApi = {
  async list() {
    const result = await apiRequest("/projects");
    return result.items;
  },
};
