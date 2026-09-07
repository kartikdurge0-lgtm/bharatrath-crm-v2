/* =========================================================
   QUOTATIONS
   Bharatrath CRM
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deleteQuotation,
  getQuotations,
  type Quotation,
  type QuotationStatus,
} from "../data/quotationStore";

import Pagination from "../components/Pagination";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 6;

/* =========================================================
   HELPERS
========================================================= */

function isActiveQuotation(quotation: Quotation): boolean {
  return quotation.isArchived !== true;
}

function safeString(value: unknown): string {
  return String(value || "").toLowerCase();
}

function currency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: QuotationStatus): string {
  switch (status) {
    case "Draft":
      return "border border-slate-200 bg-slate-50 text-slate-700";

    case "Sent":
      return "border border-blue-100 bg-blue-50 text-blue-600";

    case "Accepted":
      return "border border-green-100 bg-green-50 text-green-700";

    case "Rejected":
      return "border border-red-100 bg-red-50 text-red-600";

    case "Expired":
      return "border border-amber-100 bg-amber-50 text-amber-700";

    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getServiceNames(quotation: Quotation): string {
  if (!quotation.items || quotation.items.length === 0) {
    return "—";
  }

  const names = quotation.items
    .map((item) => String(item.description || "").trim() || "Service")
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "—";
}

/* =========================================================
   SORT HELPER
   ---------------------------------------------------------
   Global CRM rule:
   Latest created entry first.
   If createdAt is unavailable/invalid, quotation number
   is used as fallback.
========================================================= */

function getQuotationSequence(id: string): number {
  const match = String(id).match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

function sortLatestFirst(quotations: Quotation[]): Quotation[] {
  return [...quotations].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();

    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);

    if (validA && validB && dateA !== dateB) {
      return dateB - dateA;
    }

    if (validA && !validB) {
      return -1;
    }

    if (!validA && validB) {
      return 1;
    }

    return getQuotationSequence(b.id) - getQuotationSequence(a.id);
  });
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Quotations() {
  const navigate = useNavigate();

  /* =======================================================
     QUOTATIONS STATE
  ======================================================= */

  const [quotations, setQuotations] = useState<Quotation[]>(() =>
    getQuotations().filter(isActiveQuotation),
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "All">(
    "All",
  );

  const [currentPage, setCurrentPage] = useState(1);

  /* =======================================================
     REFRESH QUOTATIONS
     -------------------------------------------------------
     Only active quotations are loaded into this page.
  ======================================================= */

  function refresh() {
    const activeQuotations = getQuotations().filter(isActiveQuotation);

    setQuotations(activeQuotations);
  }

  /* =======================================================
     REFRESH ON MOUNT
  ======================================================= */

  useEffect(() => {
    refresh();
  }, []);

  /* =======================================================
     RESET PAGINATION WHEN FILTERS CHANGE
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  /* =======================================================
     DELETE / ARCHIVE QUOTATION
     -------------------------------------------------------
     deleteQuotation() performs ARCHIVE, not permanent
     deletion.
  ======================================================= */

  function handleDelete(id: string) {
    const quotation = quotations.find((item) => String(item.id) === String(id));

    if (!quotation) {
      return;
    }

    const confirmed = window.confirm(
      `Delete quotation ${quotation.quotationNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    const archived = deleteQuotation(id);

    if (!archived) {
      window.alert("Quotation could not be archived. Please try again.");

      return;
    }

    refresh();
  }

  /* =======================================================
     FILTER + SORT
     -------------------------------------------------------
     Order:
     1. Active records only
     2. Search
     3. Status filter
     4. Latest created first
     5. Pagination happens below
  ======================================================= */

  const filteredQuotations = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filtered = quotations.filter((quotation) => {
      /* -----------------------------------------------
         Never show archived quotations
      ------------------------------------------------ */

      if (quotation.isArchived === true) {
        return false;
      }

      /* -----------------------------------------------
         Search
      ------------------------------------------------ */

      const matchesSearch =
        !search ||
        safeString(quotation.clientName).includes(search) ||
        safeString(quotation.quotationNumber).includes(search) ||
        safeString(quotation.id).includes(search) ||
        safeString(quotation.status).includes(search) ||
        safeString(quotation.salesPersonName).includes(search);

      /* -----------------------------------------------
         Status
      ------------------------------------------------ */

      const matchesStatus =
        statusFilter === "All" || quotation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    /* -----------------------------------------------
       Latest quotation first
    ------------------------------------------------ */

    return sortLatestFirst(filtered);
  }, [quotations, searchTerm, statusFilter]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.ceil(filteredQuotations.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredQuotations.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredQuotations, currentPage]);

  /* =======================================================
     SUMMARY COUNTS
     -------------------------------------------------------
     Only active quotations are included.
  ======================================================= */

  const totalQuotations = quotations.filter(isActiveQuotation).length;

  const draftCount = quotations.filter(
    (quotation) => isActiveQuotation(quotation) && quotation.status === "Draft",
  ).length;

  const sentCount = quotations.filter(
    (quotation) => isActiveQuotation(quotation) && quotation.status === "Sent",
  ).length;

  const acceptedCount = quotations.filter(
    (quotation) =>
      isActiveQuotation(quotation) && quotation.status === "Accepted",
  ).length;

  const totalValue = quotations
    .filter(isActiveQuotation)
    .reduce((total, quotation) => total + Number(quotation.grandTotal || 0), 0);

  /* =======================================================
     SUMMARY CARD
  ======================================================= */

  function summaryCardClass(
    filter: QuotationStatus | "All",
    accent: string,
    ring: string,
  ) {
    return [
      "rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition",
      "hover:shadow-md",
      accent,
      statusFilter === filter ? `ring-2 ${ring}` : "",
    ].join(" ");
  }

  /* =======================================================
     RESULT RANGE
  ======================================================= */

  const resultStart =
    filteredQuotations.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const resultEnd =
    filteredQuotations.length === 0
      ? 0
      : Math.min(currentPage * PAGE_SIZE, filteredQuotations.length);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-7xl">
      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quotations</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage client quotations
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-quotation")}
          className="rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
        >
          + Add Quotation
        </button>
      </div>

      {/* =========================================
          SUMMARY CARDS
      ========================================= */}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* TOTAL */}

        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={summaryCardClass(
            "All",
            "border-l-[#94A3B8]",
            "ring-slate-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Total</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
              📋
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalQuotations}
          </p>
        </button>

        {/* DRAFT */}

        <button
          type="button"
          onClick={() => setStatusFilter("Draft")}
          className={summaryCardClass(
            "Draft",
            "border-l-[#94A3B8]",
            "ring-slate-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Draft</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
              📝
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">{draftCount}</p>
        </button>

        {/* SENT */}

        <button
          type="button"
          onClick={() => setStatusFilter("Sent")}
          className={summaryCardClass(
            "Sent",
            "border-l-[#3B82F6]",
            "ring-blue-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Sent</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm">
              📤
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#3B82F6]">{sentCount}</p>
        </button>

        {/* ACCEPTED */}

        <button
          type="button"
          onClick={() => setStatusFilter("Accepted")}
          className={summaryCardClass(
            "Accepted",
            "border-l-[#16A34A]",
            "ring-green-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Accepted</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-sm">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#16A34A]">
            {acceptedCount}
          </p>
        </button>

        {/* TOTAL VALUE */}

        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={summaryCardClass(
            "All",
            "border-l-[#16A34A]",
            "ring-green-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Total Value</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-sm">
              ₹
            </span>
          </div>

          <p className="mt-2 text-xl font-bold text-[#16A34A]">
            {currency(totalValue)}
          </p>
        </button>
      </div>

      {/* =========================================
          SEARCH + FILTER
      ========================================= */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search client or quotation number..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as QuotationStatus | "All")
            }
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Status</option>

            <option value="Draft">Draft</option>

            <option value="Sent">Sent</option>

            <option value="Accepted">Accepted</option>

            <option value="Rejected">Rejected</option>

            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* =========================================
          QUOTATIONS TABLE
      ========================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F4F7FA]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  ID
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Client
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quotation No.
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>

                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="mb-2 text-3xl">📋</div>

                    <p className="text-sm font-semibold text-slate-700">
                      No Quotations Found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {searchTerm.trim() || statusFilter !== "All"
                        ? "Try changing your search or filter."
                        : "Add a quotation to see it here."}
                    </p>

                    {!searchTerm.trim() && statusFilter === "All" && (
                      <button
                        type="button"
                        onClick={() => navigate("/add-quotation")}
                        className="mt-4 rounded-lg bg-[#16A34A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15803D]"
                      >
                        + Add Quotation
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedQuotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* ID */}

                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {quotation.id}
                    </td>

                    {/* CLIENT */}

                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {quotation.clientName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {quotation.clientId}
                      </p>
                    </td>

                    {/* QUOTATION NUMBER */}

                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-700">
                        {quotation.quotationNumber}
                      </p>
                    </td>

                    {/* DATE */}

                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {formatDate(quotation.quotationDate)}
                    </td>

                    {/* SERVICE */}

                    <td className="max-w-[280px] px-5 py-3.5">
                      <p className="line-clamp-2 text-sm text-slate-700">
                        {getServiceNames(quotation)}
                      </p>
                    </td>

                    {/* AMOUNT */}

                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {currency(quotation.grandTotal)}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${statusClass(
                          quotation.status,
                        )}`}
                      >
                        {quotation.status}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/quotations/${quotation.id}`)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/quotations/${quotation.id}/edit`)
                          }
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(quotation.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===============================================
            PAGINATION
        =============================================== */}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredQuotations.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* =========================================
          FOOTER
      ========================================= */}

      <div className="mt-3 text-xs text-slate-500">
        Showing{" "}
        <strong className="text-slate-700">
          {resultStart}
          {filteredQuotations.length > 0 && `-${resultEnd}`}
        </strong>{" "}
        of{" "}
        <strong className="text-slate-700">{filteredQuotations.length}</strong>{" "}
        filtered quotations
      </div>
    </div>
  );
}
