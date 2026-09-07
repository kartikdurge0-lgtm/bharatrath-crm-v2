import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClients, type Client } from "../data/clientStore";
import { getFollowUps, type FollowUp } from "../data/followUpStore";

type Renewal = {
  id: string;
  clientId: string;
  clientName: string;
  service: string;
  renewalDate: string;
  amount: number;
  status: "Upcoming" | "Due Soon" | "Overdue";
};

const defaultRenewals: Renewal[] = [
  {
    id: "REN-001",
    clientId: "CL-001",
    clientName: "SV enterprises pvt ltd",
    service: "Website Hosting",
    renewalDate: "2026-09-15",
    amount: 3500,
    status: "Upcoming",
  },
  {
    id: "REN-002",
    clientId: "CL-002",
    clientName: "Housey",
    service: "Domain",
    renewalDate: "2026-09-05",
    amount: 1200,
    status: "Due Soon",
  },
  {
    id: "REN-003",
    clientId: "CL-003",
    clientName: "Maharashtra Foods",
    service: "Digital Marketing",
    renewalDate: "2026-08-20",
    amount: 5000,
    status: "Overdue",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>(defaultRenewals);

  /* =====================================================
     LOAD CRM DATA
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      try {
        const [clientData, followUpData] = await Promise.all([
          getClients(),
          getFollowUps(),
        ]);

        if (!mounted) return;

        setClients(clientData);
        setFollowUps(followUpData);

        const savedRenewals = localStorage.getItem("crm-renewals");

        if (savedRenewals) {
          try {
            const parsed: Renewal[] = JSON.parse(savedRenewals);

            if (Array.isArray(parsed)) {
              setRenewals(parsed);
            }
          } catch {
            setRenewals(defaultRenewals);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        if (mounted) {
          setClients([]);
          setFollowUps([]);
        }
      }
    };

    void loadDashboardData();

    window.addEventListener("focus", loadDashboardData);

    return () => {
      mounted = false;
      window.removeEventListener("focus", loadDashboardData);
    };
  }, []);

  /* =====================================================
     ACTIVE CLIENTS
  ===================================================== */

  const activeClients = useMemo(() => {
    return clients.filter(
      (client) => client.status === "Active" && !client.archived,
    );
  }, [clients]);

  /* =====================================================
     OPEN FOLLOW-UPS
  ===================================================== */

  const openFollowUps = useMemo(() => {
    return followUps
      .filter((followUp) => followUp.status === "Pending")
      .sort((a, b) => {
        const dateA = new Date(a.followUpDate).getTime();
        const dateB = new Date(b.followUpDate).getTime();

        if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
          return dateA - dateB;
        }

        return 0;
      });
  }, [followUps]);

  /* =====================================================
     UPCOMING RENEWALS
  ===================================================== */

  const upcomingRenewals = useMemo(() => {
    return renewals
      .filter((renewal) => renewal.status !== "Overdue")
      .sort(
        (a, b) =>
          new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime(),
      )
      .slice(0, 5);
  }, [renewals]);

  /* =====================================================
     RENEWAL COUNT
  ===================================================== */

  const activeRenewalCount = useMemo(() => {
    return renewals.filter(
      (renewal) =>
        renewal.status === "Upcoming" || renewal.status === "Due Soon",
    ).length;
  }, [renewals]);

  /* =====================================================
     PENDING PAYMENTS
  ===================================================== */

  const pendingPayments = 42500;

  /* =====================================================
     RECENT CLIENTS
  ===================================================== */

  const recentClients = useMemo(() => {
    return [...clients]
      .filter((client) => !client.archived)
      .sort((a, b) => {
        const getSequence = (id: string) => {
          const match = id.match(/(\d+)$/);

          if (!match) return 0;

          const value = Number(match[1]);

          return Number.isFinite(value) ? value : 0;
        };

        return getSequence(b.id) - getSequence(a.id);
      })
      .slice(0, 5);
  }, [clients]);

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =====================================================
     DASHBOARD STATISTICS
  ===================================================== */

  const stats = [
    {
      title: "Total Clients",
      value: clients.filter((client) => !client.archived).length,
      icon: "👥",
      description: `${activeClients.length} active clients`,
      iconBg: "bg-green-50",
      iconText: "text-green-700",
      border: "border-l-green-500",
    },
    {
      title: "Active Renewals",
      value: activeRenewalCount,
      icon: "🔄",
      description: "Upcoming renewals",
      iconBg: "bg-blue-50",
      iconText: "text-blue-700",
      border: "border-l-blue-500",
    },
    {
      title: "Pending Payments",
      value: `₹${pendingPayments.toLocaleString("en-IN")}`,
      icon: "💰",
      description: "Amount outstanding",
      iconBg: "bg-orange-50",
      iconText: "text-orange-700",
      border: "border-l-orange-500",
    },
    {
      title: "Open Follow-ups",
      value: openFollowUps.length,
      icon: "📞",
      description: "Need attention",
      iconBg: "bg-red-50",
      iconText: "text-red-700",
      border: "border-l-red-500",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4 sm:space-y-5">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="min-w-0">
        <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
          Dashboard
        </h2>

        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Overview of your Bharatrath CRM
        </p>
      </div>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`min-w-0 rounded-xl border border-slate-200 border-l-4 ${stat.border} bg-white p-3.5 shadow-sm transition hover:shadow-md sm:p-4`}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                  {stat.title}
                </p>

                <p className="mt-1.5 truncate text-xl font-bold text-slate-900 sm:text-2xl">
                  {stat.value}
                </p>

                <p className="mt-1 truncate text-[11px] text-slate-400 sm:text-xs">
                  {stat.description}
                </p>
              </div>

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconText} text-base sm:h-10 sm:w-10 sm:text-lg`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =================================================
          RECENT CLIENTS + UPCOMING RENEWALS
      ================================================= */}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* =================================================
            RECENT CLIENTS
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 sm:px-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                Recent Clients
              </h3>

              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                Recently added clients
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="shrink-0 text-xs font-semibold text-green-600 hover:text-green-700"
            >
              View all →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClients.length > 0 ? (
              recentClients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-green-50/50 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {client.company}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {client.services}
                    </p>
                  </div>

                  <span
                    className={`ml-1 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium sm:px-2.5 sm:text-[11px] ${
                      client.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : client.status === "Pending"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {client.status}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-7 text-center">
                <p className="text-sm text-slate-500">No clients added yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            UPCOMING RENEWALS
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 sm:px-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                Upcoming Renewals
              </h3>

              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                Renewals requiring attention
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/renewals")}
              className="shrink-0 text-xs font-semibold text-green-600 hover:text-green-700"
            >
              View all →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingRenewals.length > 0 ? (
              upcomingRenewals.map((renewal) => (
                <button
                  type="button"
                  key={renewal.id}
                  onClick={() => navigate(`/renewals/${renewal.id}`)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-green-50/50 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {renewal.clientName}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {renewal.service} · {formatDate(renewal.renewalDate)}
                    </p>
                  </div>

                  <p className="ml-1 shrink-0 text-xs font-semibold text-slate-900 sm:text-sm">
                    ₹{renewal.amount.toLocaleString("en-IN")}
                  </p>
                </button>
              ))
            ) : (
              <div className="px-4 py-7 text-center">
                <p className="text-sm text-slate-500">No upcoming renewals.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          OPEN FOLLOW-UPS
      ================================================= */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 sm:px-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              Open Follow-ups
            </h3>

            <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
              Follow-ups that need attention
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/follow-ups")}
            className="shrink-0 text-xs font-semibold text-green-600 hover:text-green-700"
          >
            View all →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {openFollowUps.length > 0 ? (
            openFollowUps.slice(0, 5).map((followUp) => (
              <button
                type="button"
                key={followUp.id}
                onClick={() => navigate(`/follow-ups/${followUp.id}`)}
                className="flex w-full min-w-0 items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-green-50/50 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {followUp.clientName}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {followUp.purpose} · {formatDate(followUp.followUpDate)}
                  </p>
                </div>

                <span
                  className={`ml-1 shrink-0 rounded-full px-2 py-1 text-[10px] font-medium sm:px-2.5 sm:text-[11px] ${
                    followUp.priority === "High"
                      ? "bg-red-50 text-red-700"
                      : followUp.priority === "Medium"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {followUp.priority}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-7 text-center">
              <p className="text-sm text-slate-500">No open follow-ups.</p>
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            Quick Actions
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
            Common CRM actions
          </p>
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {/* =================================================
              ADD CLIENT
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/add-client")}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-3.5 py-3 text-left transition hover:border-green-200 hover:bg-green-100 sm:px-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
              👥
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-green-800">
                Add Client
              </span>

              <span className="mt-0.5 block truncate text-[11px] text-green-600">
                New client
              </span>
            </span>
          </button>

          {/* =================================================
              NEW QUOTATION
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-100 sm:px-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
              📋
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-blue-800">
                New Quotation
              </span>

              <span className="mt-0.5 block truncate text-[11px] text-blue-600">
                Create quote
              </span>
            </span>
          </button>

          {/* =================================================
              CREATE INVOICE
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3.5 py-3 text-left transition hover:border-orange-200 hover:bg-orange-100 sm:px-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
              🧾
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-orange-800">
                Create Invoice
              </span>

              <span className="mt-0.5 block truncate text-[11px] text-orange-600">
                New invoice
              </span>
            </span>
          </button>

          {/* =================================================
              ADD RENEWAL
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100 sm:px-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm">
              🔄
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">
                Add Renewal
              </span>

              <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                New renewal
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
