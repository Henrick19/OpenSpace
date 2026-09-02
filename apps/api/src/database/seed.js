import { createUploadRepository } from "../repositories/uploadRepository.js";

export function seedDemoUploads(database) {
  const uploads = createUploadRepository(database);
  if (uploads.getDashboardSummary().totalUploads > 0) return false;

  const active = uploads.create({
    siteId: "demo-robotics-lab",
    projectName: "Robotics Lab",
    sheetId: "demo-level-02",
    floorName: "Level 02",
    uploadName: "Morning inspection",
    fileName: "robotics-l2-morning.insv",
    fileSize: 8_000_000_000,
    capturedAt: "2026-09-01T11:30:00.000Z",
    startPoint: { x: 0.46, y: 0.38 },
  });
  uploads.updateProgress(active.id, 68);

  const completed = uploads.create({
    siteId: "demo-robotics-lab",
    projectName: "Robotics Lab",
    sheetId: "demo-level-02",
    floorName: "Level 02",
    uploadName: "Afternoon lab route",
    fileName: "lab-route.insv",
    fileSize: 6_400_000_000,
    capturedAt: "2026-09-01T10:10:00.000Z",
  });
  uploads.markCompleted(completed.id, {
    viewerUrl: "https://sgp.openspace.ai/",
  });

  const failed = uploads.create({
    siteId: "demo-city-campus",
    projectName: "City Campus",
    sheetId: "demo-level-01",
    floorName: "Level 01",
    uploadName: "Initial route trial",
    fileName: "trial-01.insv",
    fileSize: 4_100_000_000,
    capturedAt: "2026-08-30T08:40:00.000Z",
  });
  uploads.markFailed(failed.id, "Demo network interruption.");

  return true;
}
