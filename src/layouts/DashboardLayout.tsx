import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden bg-slate-50">
      {/* =================================================
          DESKTOP SIDEBAR
          Visible from lg (1024px) and above
      ================================================= */}

      <aside className="hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* =================================================
          TABLET / MOBILE SIDEBAR DRAWER
      ================================================= */}

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </aside>

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative z-30 shrink-0">
          <Header />
        </div>

        {/* =================================================
            MOBILE / TABLET MENU BUTTON

            Header ko change kiye bina responsive
            sidebar access provide karta hai.
        ================================================= */}

        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen(true)}
          className={`fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden ${
            isSidebarOpen ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          ☰
        </button>

        {/* =================================================
            MAIN CONTENT

            Only this area scrolls.
            min-w-0 prevents wide children from forcing
            the complete layout wider than the viewport.
        ================================================= */}

        <main className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4 lg:px-5">
          <div className="min-w-0 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
