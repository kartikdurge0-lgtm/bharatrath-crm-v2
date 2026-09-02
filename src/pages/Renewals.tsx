import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRenewals, saveRenewals, type Renewal } from "../data/renewalStore";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

const defaultRenewals: Renewal[] = [
  {
    id: "REN-001",
    clientId: "CL-001",
    clientName: "SV enterprises pvt ltd",
    service: "Website Hosting",
    renewalDate: "2026-09-15",
    amount: 3500,
    status: "Upcoming",
    notes: "Website hosting renewal.",
    createdAt: "2026-08-29",
  },
  {
    id: "REN-002",
    clientId: "CL-002",
    clientName: "Housey",
    service: "Domain",
    renewalDate: "2026-09-05",
    amount: 1200,
    status: "Due Soon",
    notes: "Domain renewal reminder.",
    createdAt: "2026-08-29",
  },
  {
    id: "REN-003",
    clientId: "CL-003",
    clientName: "Maharashtra Foods",
    service: "Digital Marketing",
    renewalDate: "2026-08-20",
    amount: 5000,
    status: "Overdue",
    notes: "Digital marketing renewal.",
    createdAt: "2026-08-29",
  },
];

export default function Renewals() {
  const navigate = useNavigate();

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  /* --------------------------------
     Load renewals
  -------------------------------- */

  const loadRenewals = () => {
    const existing = getRenewals();

    if (existing.length === 0) {
      saveRenewals(defaultRenewals);
      setRenewals(defaultRenewals);
      return;
    }

    setRenewals(existing);
  };

  useEffect(() => {
    loadRenewals();

    window.addEventListener("focus", loadRenewals);

    return () => {
      window.removeEventListener("focus", loadRenewals);
    };
  }, []);

  /* --------------------------------
     Calculate status from date
  -------------------------------- */

  const getCalculatedStatus = (renewal: Renewal): Renewal["status"] => {
    if (renewal.status === "Completed") {
      return "Completed";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const renewalDate = new Date(renewal.renewalDate);

    renewalDate.setHours(0, 0, 0, 0);

    const difference = Math.ceil(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (difference < 0) {
      return "Overdue";
    }

    if (difference <= 7) {
      return "Due Soon";
    }

    return "Upcoming";
  };

  /* --------------------------------
     Keep status updated
  -------------------------------- */

  useEffect(() => {
    if (renewals.length === 0) {
      return;
    }

    const updated = renewals.map((renewal) => ({
      ...renewal,
      status: getCalculatedStatus(renewal),
    }));

    const changed = updated.some(
      (renewal, index) => renewal.status !== renewals[index].status,
    );

    if (changed) {
      setRenewals(updated);
      saveRenewals(updated);
    }
  }, [renewals]);

  /* --------------------------------
     Summary
  -------------------------------- */

  const upcomingCount = useMemo(
    () => renewals.filter((renewal) => renewal.status === "Upcoming").length,
    [renewals],
  );

  const dueSoonCount = useMemo(
    () => renewals.filter((renewal) => renewal.status === "Due Soon").length,
    [renewals],
  );

  const overdueCount = useMemo(
    () => renewals.filter((renewal) => renewal.status === "Overdue").length,
    [renewals],
  );

  /* --------------------------------
     Search + Filter
  -------------------------------- */

  const filteredRenewals = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return renewals.filter((renewal) => {
      const matchesSearch =
        renewal.clientName.toLowerCase().includes(searchText) ||
        renewal.clientId.toLowerCase().includes(searchText) ||
        renewal.service.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" || renewal.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [renewals, search, statusFilter]);

  /* --------------------------------
     Reset pagination when filters change
  -------------------------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* --------------------------------
     Pagination
  -------------------------------- */

  const totalPages = Math.ceil(filteredRenewals.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedRenewals = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredRenewals.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRenewals, currentPage]);

  /* --------------------------------
     Date formatter
  -------------------------------- */

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* --------------------------------
     Summary card helper
  -------------------------------- */

  const summaryCardClass = (filter: string, accent: string, ring: string) => {
    return [
      "rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition",
      "hover:shadow-md",
      accent,
      statusFilter === filter ? `ring-2 ${ring}` : "",
    ].join(" ");
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Renewals</h2>

          <p className="mt-1 text-sm text-slate-500">
            Track upcoming and overdue client service renewals
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-renewal")}
          className="shrink-0 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
        >
          + Add Renewal
        </button>
      </div>

      {/* --------------------------------
          Summary Cards
      -------------------------------- */}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Upcoming */}

        <button
          type="button"
          onClick={() => setStatusFilter("upcoming")}
          className={summaryCardClass(
            "upcoming",
            "border-l-[#16A34A]",
            "ring-green-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Upcoming</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-sm">
              🔄
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#16A34A]">
            {upcomingCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">More than 7 days</p>
        </button>

        {/* Due Soon */}

        <button
          type="button"
          onClick={() => setStatusFilter("due soon")}
          className={summaryCardClass(
            "due soon",
            "border-l-[#F59E0B]",
            "ring-amber-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Due Soon</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-sm">
              ⏰
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#F59E0B]">
            {dueSoonCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">Within 7 days</p>
        </button>

        {/* Overdue */}

        <button
          type="button"
          onClick={() => setStatusFilter("overdue")}
          className={summaryCardClass(
            "overdue",
            "border-l-[#F97316]",
            "ring-orange-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Overdue</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-sm">
              ⚠️
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#EF4444]">
            {overdueCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">Requires attention</p>
        </button>
      </div>

      {/* --------------------------------
          Search + Filter
      -------------------------------- */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, service or client ID..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="due soon">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* --------------------------------
          Table
      -------------------------------- */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {paginatedRenewals.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-slate-200 bg-[#F4F7FA]">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Service
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Renewal Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRenewals.map((renewal) => (
                    <tr key={renewal.id} className="hover:bg-slate-50">
                      {/* Client */}

                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {renewal.clientName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {renewal.clientId}
                        </p>
                      </td>

                      {/* Service */}

                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {renewal.service}
                      </td>

                      {/* Date */}

                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {formatDate(renewal.renewalDate)}
                      </td>

                      {/* Amount */}

                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">
                        ₹{renewal.amount.toLocaleString("en-IN")}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
                            renewal.status === "Upcoming"
                              ? "border border-green-100 bg-green-50 text-green-700"
                              : renewal.status === "Due Soon"
                                ? "border border-amber-100 bg-amber-50 text-amber-700"
                                : renewal.status === "Overdue"
                                  ? "border border-red-100 bg-red-50 text-red-600"
                                  : "border border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {renewal.status}
                        </span>
                      </td>

                      {/* Action */}

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/renewals/${renewal.id}`)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredRenewals.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="mb-2 text-3xl">🔄</div>

            <p className="text-sm font-semibold text-slate-700">
              No renewals found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
