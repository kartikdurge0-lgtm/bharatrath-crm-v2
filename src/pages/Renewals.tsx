import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveRenewals, type Renewal } from "../data/renewalStore";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

export default function Renewals() {
  const navigate = useNavigate();

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* --------------------------------
     Load renewals from Supabase
     Supabase is the source of truth.
  -------------------------------- */

  const loadRenewals = async () => {
    try {
      setError("");

      const activeRenewals = await getActiveRenewals();

      /*
       * renewalStore calculates the display status from the
       * renewal date. We do not write calculated status back
       * to LocalStorage or Supabase from this page.
       */
      setRenewals(activeRenewals);
    } catch (err) {
      console.error("Failed to load renewals:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load renewals. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRenewals();

    /*
     * Refresh when the user returns to the tab so changes made
     * from Add/Edit/Details pages are immediately reflected.
     */
    const handleFocus = () => {
      void loadRenewals();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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
     Search + Filter + Sort
     Global CRM rule:
     Filter → Sort → Pagination

     Latest created entry first.
  -------------------------------- */

  const filteredRenewals = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    const filtered = renewals.filter((renewal) => {
      const matchesSearch =
        renewal.clientName.toLowerCase().includes(searchText) ||
        renewal.clientId.toLowerCase().includes(searchText) ||
        renewal.service.toLowerCase().includes(searchText) ||
        renewal.id.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" || renewal.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      const validA = Number.isFinite(dateA);
      const validB = Number.isFinite(dateB);

      // Latest createdAt first.
      if (validA && validB && dateA !== dateB) {
        return dateB - dateA;
      }

      // Valid createdAt comes before invalid createdAt.
      if (validA && !validB) {
        return -1;
      }

      if (!validA && validB) {
        return 1;
      }

      // Safe fallback: highest renewal number first.
      const numberA = Number(a.id.match(/(\d+)$/)?.[1] ?? 0);

      const numberB = Number(b.id.match(/(\d+)$/)?.[1] ?? 0);

      return numberB - numberA;
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
    if (!date) {
      return "-";
    }

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

  /* --------------------------------
     Summary card helper
  -------------------------------- */

  const summaryCardClass = (filter: string, accent: string, ring: string) => {
    return [
      "w-full rounded-xl border border-slate-200 border-l-4",
      "bg-white p-4 text-left shadow-sm transition",
      "hover:shadow-md",
      accent,
      statusFilter === filter ? `ring-2 ${ring}` : "",
    ].join(" ");
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0">
      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Renewals</h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Track upcoming and overdue client service renewals
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-renewal")}
          className="w-full shrink-0 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803D] sm:w-auto"
        >
          + Add Renewal
        </button>
      </div>

      {/* --------------------------------
          Summary Cards
      -------------------------------- */}

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-[#334155]">
              Upcoming
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-sm">
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
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-[#334155]">
              Due Soon
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm">
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
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-[#334155]">
              Overdue
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-sm">
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

      <div className="mb-4 min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, service or client ID..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 md:w-auto md:min-w-[170px]"
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
          Error
      -------------------------------- */}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4"
        >
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* --------------------------------
          Table
      -------------------------------- */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="mb-2 text-3xl">🔄</div>

            <p className="text-sm font-semibold text-slate-700">
              Loading renewals...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Fetching the latest renewal records.
            </p>
          </div>
        ) : paginatedRenewals.length > 0 ? (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-slate-200 bg-[#F4F7FA]">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Service
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Renewal Date
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRenewals.map((renewal) => (
                    <tr key={renewal.id} className="hover:bg-slate-50">
                      {/* Client */}

                      <td className="max-w-[320px] px-5 py-3.5">
                        <p
                          title={renewal.clientName}
                          className="truncate text-sm font-semibold text-slate-900"
                        >
                          {renewal.clientName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {renewal.clientId}
                        </p>
                      </td>

                      {/* Service */}

                      <td
                        title={renewal.service}
                        className="max-w-[260px] truncate px-5 py-3.5 text-sm text-slate-700"
                      >
                        {renewal.service}
                      </td>

                      {/* Date */}

                      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-700">
                        {formatDate(renewal.renewalDate)}
                      </td>

                      {/* Amount */}

                      <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-slate-900">
                        ₹{renewal.amount.toLocaleString("en-IN")}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${
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
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
