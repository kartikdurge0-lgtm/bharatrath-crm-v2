import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* =================================================
          SIDEBAR
          Fixed height — does not scroll with content
      ================================================= */}

      <aside className="h-screen shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <Sidebar />
      </aside>

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* =================================================
            HEADER
            Fixed at top
        ================================================= */}

        <div className="shrink-0">
          <Header />
        </div>

        {/* =================================================
            MAIN CONTENT
            ONLY THIS AREA SCROLLS
        ================================================= */}

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 md:px-5 md:py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
