import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getInvoicesSorted,
  getInvoiceSummary,
  getInvoicePaymentSummary,
  type Invoice,
  type InvoiceStatus,
} from "../data/invoiceStore";

import { getClientById } from "../data/clientStore";

import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

/* =========================================================
   HELPERS
========================================================= */

function getInvoiceSequence(id: string): number {
  const match = String(id).match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   LATEST FIRST SORT

   Global CRM rule:

   Filter
      ↓
   Sort - Latest first
      ↓
   Pagination
========================================================= */

function sortInvoicesLatestFirst(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
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

    return getInvoiceSequence(b.id) - getInvoiceSequence(a.id);
  });
}

/* =========================================================
   STATUS STYLES
========================================================= */

function statusClass(status: InvoiceStatus): string {
  switch (status) {
    case "Draft":
      return "border border-slate-200 bg-slate-50 text-slate-700";

    case "Sent":
      return "border border-blue-100 bg-blue-50 text-blue-600";

    case "Partially Paid":
      return "border border-amber-100 bg-amber-50 text-amber-700";

    case "Paid":
      return "border border-green-100 bg-green-50 text-green-700";

    case "Overdue":
      return "border border-red-100 bg-red-50 text-red-600";

    case "Cancelled":
      return "border border-red-100 bg-red-50 text-red-600";

    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value?: string): string {
  if (!value) {
    return "-";
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

/* =========================================================
   CURRENCY
========================================================= */

function currency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   CLIENT NAME
========================================================= */

function getInvoiceClientName(invoice: Invoice): string {
  if (invoice.clientId) {
    const client = getClientById(invoice.clientId);

    if (client?.company) {
      return client.company;
    }
  }

  return invoice.clientName || "-";
}

/* =========================================================
   SUMMARY CARD CLASS
========================================================= */

function summaryCardClass(accent: string): string {
  return [
    "min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition",
    "hover:shadow-md",
    accent,
  ].join(" ");
}

/* =========================================================
   INVOICE ROW
========================================================= */

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const paymentSummary = getInvoicePaymentSummary(invoice);

  const firstItem = invoice.items[0];

  const serviceName = firstItem?.serviceName || "-";

  const serviceCount = invoice.items.length;

  const clientName = getInvoiceClientName(invoice);

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      {/* ID */}

      <td className="px-4 py-3.5 text-sm text-slate-600">{invoice.id}</td>

      {/* CLIENT */}

      <td className="px-4 py-3.5">
        <div
          className="max-w-[180px] truncate text-sm font-semibold text-slate-900"
          title={clientName}
        >
          {clientName}
        </div>

        {invoice.quotationNumber && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-slate-400">From</span>

            {invoice.quotationId ? (
              <Link
                to={`/quotations/${invoice.quotationId}`}
                className="font-semibold text-green-600 hover:text-green-700 hover:underline"
              >
                {invoice.quotationNumber}
              </Link>
            ) : (
              <span className="font-semibold text-slate-500">
                {invoice.quotationNumber}
              </span>
            )}
          </div>
        )}
      </td>

      {/* INVOICE NUMBER */}

      <td className="px-4 py-3.5">
        <Link
          to={`/invoices/${invoice.id}`}
          className="font-semibold text-green-600 hover:text-green-700"
        >
          {invoice.invoiceNumber}
        </Link>
      </td>

      {/* QUOTATION */}

      <td className="px-4 py-3.5">
        {invoice.quotationNumber ? (
          invoice.quotationId ? (
            <Link
              to={`/quotations/${invoice.quotationId}`}
              className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline"
            >
              {invoice.quotationNumber}
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-600">
              {invoice.quotationNumber}
            </span>
          )
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>

      {/* DATE */}

      <td className="px-4 py-3.5 text-sm text-slate-600">
        {formatDate(invoice.invoiceDate)}
      </td>

      {/* DUE DATE */}

      <td className="px-4 py-3.5 text-sm text-slate-600">
        {formatDate(invoice.dueDate)}
      </td>

      {/* SERVICE */}

      <td className="px-4 py-3.5">
        <div
          className="max-w-[220px] truncate text-sm text-slate-700"
          title={serviceName}
        >
          {serviceName}
        </div>

        {serviceCount > 1 && (
          <div className="mt-1 text-xs text-slate-400">
            + {serviceCount - 1} more
          </div>
        )}
      </td>

      {/* AMOUNT */}

      <td className="px-4 py-3.5 text-right">
        <div className="font-semibold text-slate-900">
          {currency(invoice.grandTotal)}
        </div>

        {paymentSummary.totalPaid > 0 && !paymentSummary.isPaid && (
          <div className="mt-1 text-xs text-slate-500">
            Due {currency(paymentSummary.balance)}
          </div>
        )}
      </td>

      {/* STATUS */}

      <td className="px-4 py-3.5">
        <span
          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(
            invoice.status,
          )}`}
        >
          {invoice.status}
        </span>
      </td>

      {/* ACTION */}

      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            to={`/invoices/${invoice.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View
          </Link>

          {invoice.status !== "Cancelled" && (
            <Link
              to={`/invoices/${invoice.id}/edit`}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
            >
              Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-2xl">
        🧾
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        No Invoices Found
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Create an invoice to see it here.
      </p>

      <Link
        to="/add-invoice"
        className="mt-4 rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803D]"
      >
        + Add Invoice
      </Link>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Invoices() {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>(
    "All",
  );

  const [currentPage, setCurrentPage] = useState(1);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  /* =======================================================
     LOAD INVOICES
  ======================================================= */

  const loadInvoices = useCallback(() => {
    try {
      const data = getInvoicesSorted();

      setInvoices(data);
    } catch (error) {
      console.error("Failed to load invoices:", error);

      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    loadInvoices();

    const handleFocus = () => {
      loadInvoices();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadInvoices]);

  /* =======================================================
     FILTER + SORT

     Filter first
        ↓
     Latest created invoice first
        ↓
     Pagination
  ======================================================= */

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = invoices.filter((invoice) => {
      const clientName = getInvoiceClientName(invoice);

      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query) ||
        invoice.id.toLowerCase().includes(query) ||
        (invoice.quotationNumber || "").toLowerCase().includes(query) ||
        invoice.items.some((item) =>
          item.serviceName.toLowerCase().includes(query),
        );

      const matchesStatus =
        statusFilter === "All" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return sortInvoicesLatestFirst(filtered);
  }, [invoices, search, statusFilter]);

  /* =======================================================
     RESET PAGE WHEN FILTER CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredInvoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    return getInvoiceSummary();
  }, [invoices]);

  /* =======================================================
     FOOTER COUNT
  ======================================================= */

  const showingStart =
    filteredInvoices.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const showingEnd =
    filteredInvoices.length === 0
      ? 0
      : Math.min(currentPage * PAGE_SIZE, filteredInvoices.length);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto min-w-0 max-w-[1800px]">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>

          <p className="mt-1 text-sm text-slate-500">Manage client invoices</p>
        </div>

        <Link
          to="/add-invoice"
          className="inline-flex w-full items-center justify-center rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#15803D] sm:w-fit"
        >
          + Add Invoice
        </Link>
      </div>

      {/* =====================================================
          SUMMARY CARDS

          IMPORTANT:
          Search/filter is intentionally BELOW these cards,
          matching Quotations and Payments pages.
      ===================================================== */}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* TOTAL */}

        <div className={summaryCardClass("border-l-[#94A3B8]")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#334155]">Total</p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm">
              🧾
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.total}
          </p>

          <p className="mt-1 text-xs text-slate-400">Total invoices</p>
        </div>

        {/* DRAFT */}

        <div className={summaryCardClass("border-l-[#94A3B8]")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#334155]">Draft</p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm">
              📝
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {summary.draft}
          </p>

          <p className="mt-1 text-xs text-slate-400">Not sent yet</p>
        </div>

        {/* SENT */}

        <div className={summaryCardClass("border-l-[#3B82F6]")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#334155]">Sent</p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm">
              📤
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#3B82F6]">
            {summary.sent}
          </p>

          <p className="mt-1 text-xs text-slate-400">Sent to clients</p>
        </div>

        {/* PAID */}

        <div className={summaryCardClass("border-l-[#16A34A]")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#334155]">Paid</p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-sm">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#16A34A]">
            {summary.accepted}
          </p>

          <p className="mt-1 text-xs text-slate-400">Fully paid</p>
        </div>

        {/* OUTSTANDING */}

        <div className={summaryCardClass("border-l-[#F59E0B]")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#334155]">Outstanding</p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm">
              ₹
            </span>
          </div>

          <p className="mt-2 break-words text-xl font-bold text-[#F59E0B]">
            {currency(summary.outstanding)}
          </p>

          <p className="mt-1 text-xs text-slate-400">Amount pending</p>
        </div>
      </div>

      {/* =====================================================
          SEARCH + STATUS FILTER

          Same position as Quotations / Payments.
      ===================================================== */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search client, invoice no., quotation no. or service..."
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "All" | InvoiceStatus)
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Status</option>

            <option value="Draft">Draft</option>

            <option value="Sent">Sent</option>

            <option value="Partially Paid">Partially Paid</option>

            <option value="Paid">Paid</option>

            <option value="Overdue">Overdue</option>

            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          INVOICE LIST
      ===================================================== */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* TABLE HEADER */}

        <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">Invoice List</h3>

            <p className="mt-1 text-xs text-slate-500">All client invoices</p>
          </div>

          {search || statusFilter !== "All" ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
              className="w-fit text-sm font-semibold text-[#16A34A] hover:text-[#15803D]"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4F7FA] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">ID</th>

                  <th className="px-4 py-3">Client</th>

                  <th className="px-4 py-3">Invoice No.</th>

                  <th className="px-4 py-3">Quotation</th>

                  <th className="px-4 py-3">Date</th>

                  <th className="px-4 py-3">Due Date</th>

                  <th className="px-4 py-3">Service</th>

                  <th className="px-4 py-3 text-right">Amount</th>

                  <th className="px-4 py-3">Status</th>

                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedInvoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}

        {/* ===================================================
            PAGINATION
        =================================================== */}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* =====================================================
          FOOTER COUNT
      ===================================================== */}

      <div className="mt-3 text-sm text-slate-500">
        Showing{" "}
        <span className="font-medium text-slate-700">
          {showingStart}-{showingEnd}
        </span>{" "}
        of{" "}
        <span className="font-medium text-slate-700">
          {filteredInvoices.length}
        </span>{" "}
        filtered invoices
      </div>
    </div>
  );
}
