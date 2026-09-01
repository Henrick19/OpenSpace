import { Outlet } from "react-router-dom";

import { Sidebar } from "../components/Sidebar.jsx";
import { TopBar } from "../components/TopBar.jsx";

export function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
