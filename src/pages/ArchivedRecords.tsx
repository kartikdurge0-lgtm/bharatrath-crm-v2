import React, { useEffect, useMemo, useState } from "react";

import {
  getArchivedClientsFromSupabase,
  restoreClient,
  type Client,
} from "../data/clientStore";

import { getArchivedLeads, restoreLead, type Lead } from "../data/leadStore";

import {
  getArchivedFollowUps,
  restoreFollowUp,
  type FollowUp,
} from "../data/followUpStore";

import {
  getArchivedQuotations,
  restoreQuotation,
  type Quotation,
} from "../data/quotationStore";

import {
  getArchivedRenewals,
  restoreRenewal,
  type Renewal,
} from "../data/renewalStore";

type ArchiveTab =
  | "all"
  | "clients"
  | "leads"
  | "followups"
  | "quotations"
  | "renewals"
  | "invoices"
  | "payments";

type ArchiveRecordType =
  | "Client"
  | "Lead"
  | "Follow-up"
  | "Quotation"
  | "Renewal";

type ArchiveRecord = {
  id: string;
  type: ArchiveRecordType;
  name: string;
  detail: string;
  date: string;
  amount?: number;
};

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

function getTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function typeClass(type: ArchiveRecordType) {
  switch (type) {
    case "Client":
      return "bg-green-50 text-green-700";
    case "Lead":
      return "bg-blue-50 text-blue-700";
    case "Follow-up":
      return "bg-pink-50 text-pink-700";
    case "Quotation":
      return "bg-slate-100 text-slate-700";
    case "Renewal":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ArchivedRecords() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("all");

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * =========================================================
   * LOAD ALL ARCHIVED RECORDS
   *
   * This page is the central archive location.
   * Every module that currently has a real archive/restore
   * workflow is loaded here.
   * =========================================================
   */
  const refreshArchivedRecords = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const results = await Promise.allSettled([
      getArchivedClientsFromSupabase(),
      getArchivedLeads(),
      getArchivedFollowUps(),
      getArchivedQuotations(),
      getArchivedRenewals(),
    ]);

    const [
      clientsResult,
      leadsResult,
      followUpsResult,
      quotationsResult,
      renewalsResult,
    ] = results;

    setClients(clientsResult.status === "fulfilled" ? clientsResult.value : []);

    setLeads(leadsResult.status === "fulfilled" ? leadsResult.value : []);

    setFollowUps(
      followUpsResult.status === "fulfilled" ? followUpsResult.value : [],
    );

    setQuotations(
      quotationsResult.status === "fulfilled" ? quotationsResult.value : [],
    );

    setRenewals(
      renewalsResult.status === "fulfilled" ? renewalsResult.value : [],
    );

    const failedModules: string[] = [];

    if (clientsResult.status === "rejected") failedModules.push("Clients");
    if (leadsResult.status === "rejected") failedModules.push("Leads");
    if (followUpsResult.status === "rejected") {
      failedModules.push("Follow-ups");
    }
    if (quotationsResult.status === "rejected") {
      failedModules.push("Quotations");
    }
    if (renewalsResult.status === "rejected") {
      failedModules.push("Renewals");
    }

    if (failedModules.length > 0) {
      console.error("Failed archived modules:", results);

      setError(
        `Could not load: ${failedModules.join(
          ", ",
        )}. Other archived records are shown.`,
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void refreshArchivedRecords();
  }, []);

  /*
   * Refresh when the user returns to this browser tab.
   */
  useEffect(() => {
    const handleFocus = () => {
      void refreshArchivedRecords();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshArchivedRecords();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /*
   * =========================================================
   * NORMALIZE RECORDS
   * =========================================================
   */
  const allRecords = useMemo<ArchiveRecord[]>(() => {
    const records: ArchiveRecord[] = [];

    clients.forEach((client) => {
      records.push({
        id: client.id,
        type: "Client",
        name: client.company || client.id,
        detail: client.contactPerson || client.phone || client.email || "-",
        date: "",
      });
    });

    leads.forEach((lead) => {
      records.push({
        id: lead.id,
        type: "Lead",
        name: lead.companyName || lead.contactPerson || lead.id,
        detail: lead.contactPerson || lead.phone || lead.email || "-",
        date: lead.archivedAt || lead.updatedAt || lead.createdAt || "",
        amount: numberValue(lead.expectedValue),
      });
    });

    followUps.forEach((followUp) => {
      records.push({
        id: followUp.id,
        type: "Follow-up",
        name: followUp.clientName || followUp.relatedName || followUp.id,
        detail: followUp.purpose || followUp.status || "-",
        date: followUp.archivedAt || followUp.createdAt || "",
      });
    });

    quotations.forEach((quotation) => {
      const q = quotation as unknown as Record<string, unknown>;

      records.push({
        id: stringValue(q.id),
        type: "Quotation",
        name:
          stringValue(q.quotationNumber) ||
          stringValue(q.clientName) ||
          stringValue(q.id),
        detail: stringValue(q.clientName) || stringValue(q.status) || "-",
        date:
          stringValue(q.archivedAt) ||
          stringValue(q.updatedAt) ||
          stringValue(q.createdAt) ||
          "",
        amount: numberValue(
          q.grandTotal ?? q.grand_total ?? q.total ?? q.amount,
        ),
      });
    });

    renewals.forEach((renewal) => {
      records.push({
        id: renewal.id,
        type: "Renewal",
        name: renewal.id,
        detail: renewal.clientName || renewal.service || "-",
        date:
          renewal.updatedAt || renewal.createdAt || renewal.renewalDate || "",
        amount: numberValue(renewal.amount),
      });
    });

    return records.sort((a, b) => {
      const dateDifference = getTime(b.date) - getTime(a.date);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return String(b.id).localeCompare(String(a.id));
    });
  }, [clients, leads, followUps, quotations, renewals]);

  /*
   * =========================================================
   * COUNTS
   * =========================================================
   */
  const counts = {
    clients: clients.length,
    leads: leads.length,
    followups: followUps.length,
    quotations: quotations.length,
    renewals: renewals.length,
  };

  /*
   * =========================================================
   * TAB FILTER + SEARCH
   * =========================================================
   */
  const filteredRecords = useMemo(() => {
    let records = allRecords;

    if (activeTab !== "all") {
      records = records.filter((record) => {
        if (activeTab === "clients") return record.type === "Client";
        if (activeTab === "leads") return record.type === "Lead";
        if (activeTab === "followups") return record.type === "Follow-up";
        if (activeTab === "quotations") return record.type === "Quotation";
        if (activeTab === "renewals") return record.type === "Renewal";

        /*
         * Invoices and Payments do not yet have a database
         * archive/restore workflow in the current stores.
         */
        return false;
      });
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) =>
      [
        record.id,
        record.type,
        record.name,
        record.detail,
        String(record.amount ?? ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeTab, allRecords, search]);

  /*
   * =========================================================
   * PAGINATION
   * =========================================================
   */
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  /*
   * =========================================================
   * PAGE NUMBERS
   * =========================================================
   */
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

  /*
   * =========================================================
   * RESTORE
   * =========================================================
   */
  const handleRestore = async (record: ArchiveRecord) => {
    if (restoringKey) {
      return;
    }

    const confirmed = window.confirm(
      `Restore ${record.type.toLowerCase()} "${record.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    const key = `${record.type}:${record.id}`;

    setRestoringKey(key);
    setMessage("");
    setError("");

    try {
      let restored = false;

      if (record.type === "Client") {
        await restoreClient(record.id);
        restored = true;
      }

      if (record.type === "Lead") {
        restored = await restoreLead(record.id);
      }

      if (record.type === "Follow-up") {
        restored = (await restoreFollowUp(record.id)) !== null;
      }

      if (record.type === "Quotation") {
        restored = (await restoreQuotation(record.id)) !== null;
      }

      if (record.type === "Renewal") {
        restored = (await restoreRenewal(record.id)) !== null;
      }

      if (!restored) {
        throw new Error(`Failed to restore ${record.type.toLowerCase()}.`);
      }

      setMessage(`${record.type} "${record.name}" restored successfully.`);

      await refreshArchivedRecords();
    } catch (err) {
      console.error(`Failed to restore ${record.type}:`, err);

      setError(
        err instanceof Error
          ? err.message
          : `Failed to restore ${record.type.toLowerCase()}. Please try again.`,
      );
    } finally {
      setRestoringKey(null);
    }
  };

  /*
   * =========================================================
   * TABS
   * =========================================================
   */
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
      count: allRecords.length,
    },
    {
      key: "clients",
      label: "Clients",
      icon: "👥",
      count: counts.clients,
    },
    {
      key: "leads",
      label: "Leads",
      icon: "🎯",
      count: counts.leads,
    },
    {
      key: "followups",
      label: "Follow-ups",
      icon: "📞",
      count: counts.followups,
    },
    {
      key: "quotations",
      label: "Quotations",
      icon: "🧾",
      count: counts.quotations,
    },
    {
      key: "renewals",
      label: "Renewals",
      icon: "🔄",
      count: counts.renewals,
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

  const isUnavailableTab = activeTab === "invoices" || activeTab === "payments";

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
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch("");
                }}
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
      {!isUnavailableTab && (
        <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search archived ${
                activeTab === "all"
                  ? "records"
                  : tabs
                      .find((tab) => tab.key === activeTab)
                      ?.label.toLowerCase()
              }...`}
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
      )}

      {/* INVOICE / PAYMENT PLACEHOLDER */}
      {isUnavailableTab ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-14 text-center">
          <div className="text-3xl">
            {activeTab === "invoices" ? "🧾" : "💳"}
          </div>

          <h3 className="mt-3 font-semibold text-slate-800">
            {activeTab === "invoices"
              ? "Archived Invoices"
              : "Archived Payments"}
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {activeTab === "invoices"
              ? "Invoice archive and restore workflow is not yet available in the current invoice store."
              : "Payment archive and restore workflow is not yet available in the current payment store."}
          </p>
        </div>
      ) : (
        <>
          {/* CONTENT */}
          <div className="mt-5">
            <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">
                  {activeTab === "all"
                    ? "All Archived Records"
                    : tabs.find((tab) => tab.key === activeTab)?.label}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {filteredRecords.length}{" "}
                  {filteredRecords.length === 1 ? "record" : "records"} found.
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
                      Record
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                      Type
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                      Details
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                      Archived
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                      Amount
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
                        colSpan={6}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        <div className="text-2xl">⏳</div>

                        <div className="mt-2 font-medium">
                          Loading archived records...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        <div className="text-3xl">🗄️</div>

                        <div className="mt-2 font-semibold text-slate-700">
                          No archived records
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          Archived records will appear here.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const key = `${record.type}:${record.id}`;
                      const restoring = restoringKey === key;

                      return (
                        <tr
                          key={key}
                          className="border-t border-slate-100 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {record.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {record.id}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass(
                                record.type,
                              )}`}
                            >
                              {record.type}
                            </span>
                          </td>

                          <td className="max-w-[280px] px-4 py-3">
                            <div
                              className="truncate text-slate-600"
                              title={record.detail}
                            >
                              {record.detail}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {formatDate(record.date)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
                            {record.amount !== undefined && record.amount > 0
                              ? `₹${record.amount.toLocaleString("en-IN")}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={restoring}
                              onClick={() => void handleRestore(record)}
                              className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {restoring ? "Restoring..." : "Restore"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {filteredRecords.length > 0 && (
              <div className="border-t border-slate-100">
                <div className="flex min-w-0 flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * PAGE_SIZE + 1}-
                      {Math.min(
                        currentPage * PAGE_SIZE,
                        filteredRecords.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredRecords.length}
                    </span>{" "}
                    records
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
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
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
        </>
      )}
    </section>
  );
}
