import React, { useEffect, useMemo, useState } from "react";

import {
  getArchivedRenewals,
  restoreRenewal,
  type Renewal,
} from "../data/renewalStore";

type ArchiveTab = "all" | "clients" | "renewals" | "invoices" | "payments";

const PAGE_SIZE = 8;

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRecordDate(record: Renewal) {
  return record.updatedAt || record.createdAt || record.renewalDate || "";
}

export default function ArchivedRecords() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("all");

  const [renewals, setRenewals] = useState<Renewal[]>([]);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  /* --------------------------------
     Load archived records
  -------------------------------- */

  const refreshArchivedRecords = async () => {
    setLoading(true);
    setError("");

    try {
      const archivedRenewals = await getArchivedRenewals();

      setRenewals(archivedRenewals);
    } catch (err) {
      console.error("Failed to load archived records:", err);

      setRenewals([]);

      setError(
        "Failed to load archived records. Please refresh and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshArchivedRecords();
  }, []);

  /* --------------------------------
     Search
  -------------------------------- */

  const filteredRenewals = useMemo(() => {
    const query = search.trim().toLowerCase();

    const sorted = [...renewals].sort((a, b) => {
      const dateA = new Date(getRecordDate(a)).getTime();
      const dateB = new Date(getRecordDate(b)).getTime();

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return String(b.id).localeCompare(String(a.id));
    });

    if (!query) {
      return sorted;
    }

    return sorted.filter((renewal) => {
      return (
        renewal.clientName.toLowerCase().includes(query) ||
        renewal.service.toLowerCase().includes(query) ||
        renewal.id.toLowerCase().includes(query) ||
        String(renewal.amount).includes(query) ||
        (renewal.notes || "").toLowerCase().includes(query)
      );
    });
  }, [renewals, search]);

  /* --------------------------------
     Pagination
  -------------------------------- */

  const totalPages = Math.ceil(filteredRenewals.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRenewals = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredRenewals.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRenewals, currentPage]);

  /* --------------------------------
     Page numbers
  -------------------------------- */

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();

    pages.add(1);
    pages.add(2);
    pages.add(totalPages - 1);
    pages.add(totalPages);
    pages.add(currentPage);

    if (currentPage > 1) {
      pages.add(currentPage - 1);
    }

    if (currentPage < totalPages) {
      pages.add(currentPage + 1);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  /* --------------------------------
     Restore
  -------------------------------- */

  const handleRestoreRenewal = async (renewal: Renewal) => {
    const confirmed = window.confirm(
      `Restore renewal for "${renewal.clientName}"?`,
    );

    if (!confirmed) {
      return;
    }

    setRestoringId(renewal.id);
    setMessage("");
    setError("");

    try {
      await restoreRenewal(renewal.id);

      setMessage(`Renewal for ${renewal.clientName} restored successfully.`);

      await refreshArchivedRecords();
    } catch (err) {
      console.error("Failed to restore renewal:", err);

      setError("Failed to restore the renewal. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  /* --------------------------------
     Tabs
  -------------------------------- */

  const tabs: {
    key: ArchiveTab;
    label: string;
    icon: string;
    count?: number;
  }[] = [
    {
      key: "all",
      label: "All",
      icon: "📦",
    },
    {
      key: "clients",
      label: "Clients",
      icon: "👥",
    },
    {
      key: "renewals",
      label: "Renewals",
      icon: "🔄",
      count: renewals.length,
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: "🧾",
    },
    {
      key: "payments",
      label: "Payments",
      icon: "💳",
    },
  ];

  /* --------------------------------
     Empty / unavailable tabs
  -------------------------------- */

  const isRenewalsTab = activeTab === "renewals";

  return (
    <section className="min-w-0 p-4 sm:p-5 md:p-6">
      {/* HEADER */}

      <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
            🗄️
          </span>

          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Archived Records
            </h2>

            <p className="mt-1 break-words text-sm text-slate-500">
              View and restore records that have been archived.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshArchivedRecords()}
          disabled={loading}
          className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          ↻ Refresh
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ {message}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* TABS */}

      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                <span>{tab.icon}</span>

                <span>{tab.label}</span>

                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      active
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH */}

      {isRenewalsTab || activeTab === "all" ? (
        <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search archived renewals..."
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      ) : null}

      {/* CONTENT */}

      {activeTab === "clients" && (
        <ComingSoon
          icon="👥"
          title="Archived Clients"
          description="Archived client records will appear here."
        />
      )}

      {activeTab === "invoices" && (
        <ComingSoon
          icon="🧾"
          title="Archived Invoices"
          description="Archived invoice records will appear here."
        />
      )}

      {activeTab === "payments" && (
        <ComingSoon
          icon="💳"
          title="Archived Payments"
          description="Archived payment records will appear here."
        />
      )}

      {(activeTab === "renewals" || activeTab === "all") && (
        <div className="mt-5">
          {/* SECTION HEADER */}

          <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                Archived Renewals
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRenewals.length}{" "}
                {filteredRenewals.length === 1 ? "renewal" : "renewals"} found.
              </p>
            </div>

            {search && (
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Search active
              </span>
            )}
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-[#F4F7FA]">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                    Renewal
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                    Client
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                    Service
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                    Renewal Date
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                    Amount
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                    Archived
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <div className="text-2xl">⏳</div>

                      <div className="mt-2 font-medium">
                        Loading archived records...
                      </div>
                    </td>
                  </tr>
                ) : paginatedRenewals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <div className="text-3xl">🗄️</div>

                      <div className="mt-2 font-semibold text-slate-700">
                        No archived renewals
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Archived renewals will appear here.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRenewals.map((renewal) => (
                    <tr
                      key={renewal.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      {/* RENEWAL */}

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {renewal.id}
                        </div>

                        {renewal.paymentStatus && (
                          <div className="mt-1 text-xs text-slate-400">
                            Payment: {renewal.paymentStatus}
                          </div>
                        )}
                      </td>

                      {/* CLIENT */}

                      <td className="max-w-[220px] px-4 py-3">
                        <div
                          className="truncate font-semibold text-slate-800"
                          title={renewal.clientName}
                        >
                          {renewal.clientName}
                        </div>
                      </td>

                      {/* SERVICE */}

                      <td className="max-w-[200px] px-4 py-3">
                        <div
                          className="truncate text-slate-600"
                          title={renewal.service}
                        >
                          {renewal.service}
                        </div>
                      </td>

                      {/* RENEWAL DATE */}

                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(renewal.renewalDate)}
                      </td>

                      {/* AMOUNT */}

                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
                        ₹{Number(renewal.amount || 0).toLocaleString("en-IN")}
                      </td>

                      {/* ARCHIVED */}

                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Archived
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={restoringId === renewal.id}
                          onClick={() => void handleRestoreRenewal(renewal)}
                          className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {restoringId === renewal.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {filteredRenewals.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="flex min-w-0 flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}-
                    {Math.min(currentPage * PAGE_SIZE, filteredRenewals.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredRenewals.length}
                  </span>{" "}
                  renewals
                </p>

                {totalPages > 1 && (
                  <div className="flex max-w-full flex-wrap items-center justify-start gap-1 sm:justify-end">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {pageNumbers.map((page, index) => {
                      const previousPage = pageNumbers[index - 1];

                      const showEllipsis =
                        previousPage !== undefined && page - previousPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-1.5 text-xs text-slate-500">
                              ...
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[32px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              currentPage === page
                                ? "bg-green-600 text-white"
                                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   COMING SOON
========================================================= */

function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-14 text-center">
      <div className="text-3xl">{icon}</div>

      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>

      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}
