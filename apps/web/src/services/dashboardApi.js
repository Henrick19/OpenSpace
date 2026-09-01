import { apiRequest } from "./apiClient.js";

export const dashboardApi = {
  getSummary() {
    return apiRequest("/dashboard/summary");
  },
};
