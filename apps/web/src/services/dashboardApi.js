import { apiRequest } from "./apiClient.js";

/** Data-access functions used by DashboardPage. */
export const dashboardApi = {
  getSummary() {
    return apiRequest("/dashboard/summary");
  },
};
