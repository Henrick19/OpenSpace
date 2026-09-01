import { apiRequest } from "./apiClient.js";

export const projectApi = {
  list() {
    return apiRequest("/projects");
  },
};
