import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout.jsx";
import { CaptureHistoryPage } from "../pages/CaptureHistoryPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { NewCapturePage } from "../pages/NewCapturePage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { UploadProgressPage } from "../pages/UploadProgressPage.jsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="captures/new" element={<NewCapturePage />} />
        <Route path="captures/:captureId/progress" element={<UploadProgressPage />} />
        <Route path="captures" element={<CaptureHistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
