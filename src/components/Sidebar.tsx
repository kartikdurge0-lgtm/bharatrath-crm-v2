import { NavLink } from "react-router-dom";

const menuSections = [
  {
    title: "SALES",
    items: [
      { label: "Quotations", path: "/quotations", icon: "📋" },
      { label: "Invoices", path: "/invoices", icon: "🧾" },
      { label: "Payments", path: "/payments", icon: "💰" },
    ],
  },
  {
    title: "SERVICES",
    items: [{ label: "Services", path: "/services", icon: "🛠️" }],
  },
  {
    title: "REPORTS",
    items: [{ label: "Reports", path: "/reports", icon: "📊" }],
  },
  {
    title: "SYSTEM",
    items: [{ label: "Settings", path: "/settings", icon: "⚙️" }],
  },
];

const baseItemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150";

export default function Sidebar() {
  return (
    <aside className="flex h-full min-h-0 w-64 max-w-[85vw] flex-col border-r border-gray-200 bg-white">
      {/* =================================================
          BRANDING
      ================================================= */}

      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4 sm:px-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-6 text-green-600">
            Bharatrath
          </h1>

          <p className="mt-0.5 whitespace-nowrap text-[10px] font-medium tracking-wide text-gray-500">
            Everything Your Business Needs
          </p>
        </div>
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2.5 py-3 sm:px-3">
        {/* =================================================
            DASHBOARD
        ================================================= */}

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${baseItemClass} mb-4 ${
              isActive
                ? "bg-green-50 font-medium text-green-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`
          }
        >
          <span className="flex w-5 shrink-0 items-center justify-center text-base">
            🏠
          </span>

          <span className="truncate">Dashboard</span>
        </NavLink>

        {/* =================================================
            CRM
        ================================================= */}

        <div className="mb-4">
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-gray-400">
            CRM
          </p>

          <div className="space-y-0.5">
            {/* Leads */}

            <NavLink
              to="/leads"
              className={({ isActive }) =>
                `${baseItemClass} ${
                  isActive
                    ? "bg-green-50 font-medium text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-base">
                🎯
              </span>

              <span className="truncate">Leads</span>
            </NavLink>

            {/* Follow-ups */}

            <NavLink
              to="/follow-ups"
              className={({ isActive }) =>
                `${baseItemClass} ${
                  isActive
                    ? "bg-green-50 font-medium text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-base">
                📞
              </span>

              <span className="truncate">Follow-ups</span>
            </NavLink>

            {/* Clients */}

            <NavLink
              to="/clients"
              className={({ isActive }) =>
                `${baseItemClass} ${
                  isActive
                    ? "bg-green-50 font-medium text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-base">
                👥
              </span>

              <span className="truncate">Clients</span>
            </NavLink>

            {/* Renewals */}

            <NavLink
              to="/renewals"
              className={({ isActive }) =>
                `${baseItemClass} ${
                  isActive
                    ? "bg-green-50 font-medium text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="flex w-5 shrink-0 items-center justify-center text-base">
                🔄
              </span>

              <span className="truncate">Renewals</span>
            </NavLink>
          </div>
        </div>

        {/* =================================================
            OTHER SECTIONS
        ================================================= */}

        {menuSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-gray-400">
              {section.title}
            </p>

            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `${baseItemClass} ${
                      isActive
                        ? "bg-green-50 font-medium text-green-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <span className="flex w-5 shrink-0 items-center justify-center text-base">
                    {item.icon}
                  </span>

                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="shrink-0 border-t border-gray-200 px-4 py-2.5">
        <p className="truncate text-[10px] text-gray-400">Bharatrath CRM</p>
      </div>
    </aside>
  );
}
