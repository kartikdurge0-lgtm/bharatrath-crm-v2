import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  cancelInvoicePayment,
  getInvoicePaymentSummary,
  getInvoicesSorted,
  type Invoice,
  type InvoicePayment,
} from "../data/invoiceStore";

import { getClientById } from "../data/clientStore";
import AddPaymentModal from "../components/AddPaymentModal";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

/* =========================================================
   HELPERS
========================================================= */

function getSequence(id: string): number {
  const match = String(id).match(/(\d+)$/);

  if (!match) return 0;

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   LATEST INVOICE FIRST
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

    if (validA && !validB) return -1;
    if (!validA && validB) return 1;

    return getSequence(b.id) - getSequence(a.id);
  });
}

/* =========================================================
   PAYMENT HISTORY
   LATEST PAYMENT FIRST
========================================================= */

function sortPaymentHistoryLatestFirst(
  history: {
    invoice: Invoice;
    payment: InvoicePayment;
  }[],
) {
  return [...history].sort((a, b) => {
    const dateA = new Date(`${a.payment.paymentDate}T00:00:00`).getTime();

    const dateB = new Date(`${b.payment.paymentDate}T00:00:00`).getTime();

    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);

    if (validA && validB && dateA !== dateB) {
      return dateB - dateA;
    }

    if (validA && !validB) return -1;
    if (!validA && validB) return 1;

    return getSequence(b.payment.id) - getSequence(a.payment.id);
  });
}

/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   PAYMENT STATUS
========================================================= */

function getPaymentStatus(invoice: Invoice) {
  const paymentSummary = getInvoicePaymentSummary(invoice);

  if (invoice.status === "Cancelled") {
    return "Cancelled";
  }

  if (paymentSummary.balance <= 0) {
    return "Paid";
  }

  if (paymentSummary.totalPaid > 0) {
    return "Partially Paid";
  }

  if (invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`) < new Date()) {
    return "Overdue";
  }

  return "Pending";
}

/* =========================================================
   STATUS CLASSES
========================================================= */

function getStatusClasses(status: string) {
  switch (status) {
    case "Paid":
      return "border border-green-100 bg-green-50 text-green-700";

    case "Partially Paid":
      return "border border-blue-100 bg-blue-50 text-blue-600";

    case "Overdue":
      return "border border-red-100 bg-red-50 text-red-600";

    case "Pending":
      return "border border-amber-100 bg-amber-50 text-amber-700";

    case "Cancelled":
      return "border border-slate-200 bg-slate-100 text-slate-500";

    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  valueColor,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  accent: string;
  valueColor: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md ${accent}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-700">{title}</p>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm">
          {icon}
        </span>
      </div>

      <p
        className={`mt-2 truncate text-lg font-bold sm:text-xl ${valueColor}`}
        title={String(value)}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "Partially Paid" | "Paid" | "Overdue"
  >("All");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [proofPreview, setProofPreview] = useState<{
    invoice: Invoice;
    payment: InvoicePayment;
  } | null>(null);

  const [receiptPreview, setReceiptPreview] = useState<{
    invoice: Invoice;
    payment: InvoicePayment;
  } | null>(null);

  const [invoicePage, setInvoicePage] = useState(1);

  const [historyPage, setHistoryPage] = useState(1);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadInvoices = () => {
    setInvoices(getInvoicesSorted());
  };

  useEffect(() => {
    loadInvoices();

    const handleFocus = () => {
      loadInvoices();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let totalInvoiceValue = 0;
    let totalReceived = 0;
    let outstanding = 0;
    let fullyPaid = 0;

    invoices.forEach((invoice) => {
      const paymentSummary = getInvoicePaymentSummary(invoice);

      totalInvoiceValue += invoice.grandTotal || invoice.amount || 0;

      totalReceived += paymentSummary.totalPaid;

      outstanding += paymentSummary.balance;

      if (paymentSummary.balance <= 0 && invoice.grandTotal > 0) {
        fullyPaid += 1;
      }
    });

    return {
      totalInvoices: invoices.length,
      totalInvoiceValue,
      totalReceived,
      outstanding,
      fullyPaid,
    };
  }, [invoices]);

  /* =======================================================
     FILTER → SORT
  ======================================================= */

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = invoices.filter((invoice) => {
      const client = getClientById(invoice.clientId);

      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.clientName.toLowerCase().includes(query) ||
        (invoice.clientPhone || "").toLowerCase().includes(query) ||
        (client?.contactPerson || "").toLowerCase().includes(query);

      const paymentStatus = getPaymentStatus(invoice);

      const matchesStatus =
        statusFilter === "All" || paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return sortInvoicesLatestFirst(filtered);
  }, [invoices, search, statusFilter]);

  /* =======================================================
     INVOICE PAGINATION
  ======================================================= */

  const invoiceTotalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);

  useEffect(() => {
    setInvoicePage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (invoiceTotalPages > 0 && invoicePage > invoiceTotalPages) {
      setInvoicePage(invoiceTotalPages);
    }

    if (invoiceTotalPages === 0 && invoicePage !== 1) {
      setInvoicePage(1);
    }
  }, [invoicePage, invoiceTotalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (invoicePage - 1) * PAGE_SIZE;

    return filteredInvoices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredInvoices, invoicePage]);

  /* =======================================================
     PAYMENT HISTORY
  ======================================================= */

  const paymentHistory = useMemo(() => {
    const history = invoices.flatMap((invoice) =>
      invoice.payments
        .filter((payment) => payment.status !== "Cancelled")
        .map((payment) => ({
          invoice,
          payment,
        })),
    );

    return sortPaymentHistoryLatestFirst(history);
  }, [invoices]);

  const historyTotalPages = Math.ceil(paymentHistory.length / PAGE_SIZE);

  useEffect(() => {
    if (historyTotalPages > 0 && historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }

    if (historyTotalPages === 0 && historyPage !== 1) {
      setHistoryPage(1);
    }
  }, [historyPage, historyTotalPages]);

  const paginatedPaymentHistory = useMemo(() => {
    const startIndex = (historyPage - 1) * PAGE_SIZE;

    return paymentHistory.slice(startIndex, startIndex + PAGE_SIZE);
  }, [paymentHistory, historyPage]);

  /* =======================================================
     ADD PAYMENT
  ======================================================= */

  const handleAddPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSaved = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    loadInvoices();
  };

  /* =======================================================
     RECEIPT
  ======================================================= */

  const handleOpenReceipt = (invoice: Invoice, payment: InvoicePayment) => {
    setReceiptPreview({
      invoice,
      payment,
    });
  };

  const handleCloseReceipt = () => {
    setReceiptPreview(null);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  /* =======================================================
     CANCEL PAYMENT
  ======================================================= */

  const handleCancelPayment = (invoice: Invoice, payment: InvoicePayment) => {
    const reason = window.prompt("Enter reason for cancelling this payment:");

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      window.alert("Cancellation reason is required.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel payment of ${formatCurrency(
        payment.amountPaid,
      )} for ${invoice.invoiceNumber}?`,
    );

    if (!confirmed) return;

    const result = cancelInvoicePayment(invoice.id, payment.id, trimmedReason);

    if (!result) {
      window.alert("Unable to cancel the payment.");
      return;
    }

    loadInvoices();
  };

  /* =======================================================
     RECEIPT VIEW
  ======================================================= */

  if (receiptPreview) {
    const receiptInvoice = receiptPreview.invoice;

    const receiptPayment = receiptPreview.payment;

    const receiptSummary = getInvoicePaymentSummary(receiptInvoice);

    const receiptClient = receiptInvoice.clientId
      ? getClientById(receiptInvoice.clientId)
      : undefined;

    return (
      <div className="min-h-screen bg-slate-100 py-4 sm:py-6">
        {/* SCREEN HEADER */}

        <div className="mx-auto mb-4 flex w-full max-w-[900px] flex-col gap-2 px-3 print:hidden sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <button
            type="button"
            onClick={handleCloseReceipt}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            ← Back to Payments
          </button>

          <button
            type="button"
            onClick={handlePrintReceipt}
            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Print Receipt
          </button>
        </div>

        {/* RECEIPT */}

        <div
          id="payment-receipt-print"
          className="mx-auto w-full max-w-[900px] bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-8 print:max-w-none print:px-0 print:py-0 print:shadow-none"
        >
          {/* HEADER */}

          <div className="border border-gray-300 px-4 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8">
              {/* COMPANY */}

              <div className="min-w-0 flex-1">
                <img
                  src="/images/bharatrath-logo.png"
                  alt="Bharatrath"
                  className="receipt-logo mb-4 h-auto w-[145px] max-w-full object-contain object-left sm:w-[165px]"
                />

                <p className="text-sm font-medium text-gray-700">
                  Digital Business Solutions
                </p>

                <div className="mt-4 text-[10px] leading-[1.55] text-gray-600 sm:text-[11px]">
                  <p className="font-semibold text-gray-800">
                    Ashti Ventures Pvt. Ltd. (Bharatrath)
                  </p>

                  <p className="break-words">
                    813/801, 8 th Floor, Tower A, WORLD TRADE CENTER,
                  </p>

                  <p className="break-words">
                    EON Free Zone, Kharadi, Pune, Maharashtra, India
                  </p>

                  <p className="font-semibold">GST No – 27AAQCA3940C1ZR</p>

                  <p>Email – info@bharatrath.com</p>

                  <p>www.bharatrath.com</p>
                </div>
              </div>

              {/* RECEIPT DETAILS */}

              <div className="w-full shrink-0 md:w-[280px]">
                <h1 className="mb-5 text-left text-2xl font-bold uppercase text-gray-900 sm:text-3xl md:text-right">
                  Payment Receipt
                </h1>

                <table className="w-full text-[11px] sm:text-[12px]">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-500">Receipt No:</td>

                      <td className="break-all py-1 text-right font-semibold text-gray-900">
                        {receiptPayment.id}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1 text-gray-500">Payment Date:</td>

                      <td className="py-1 text-right">
                        {formatDate(receiptPayment.paymentDate)}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1 text-gray-500">Invoice No:</td>

                      <td className="break-all py-1 text-right font-semibold">
                        {receiptInvoice.invoiceNumber}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1 text-gray-500">Payment Mode:</td>

                      <td className="py-1 text-right">
                        {receiptPayment.paymentMode || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RECEIVED FROM */}

          <div className="mt-5 rounded-lg border border-gray-300 px-4 py-4 sm:px-5 sm:py-5">
            <p className="mb-2 text-[11px] font-semibold uppercase text-gray-500">
              Received From
            </p>

            <p className="break-words text-base font-bold text-gray-900">
              {receiptInvoice.clientName}
            </p>

            {receiptInvoice.clientContactPerson && (
              <p className="mt-1 break-words text-xs text-gray-600">
                Contact Person: {receiptInvoice.clientContactPerson}
              </p>
            )}

            {!receiptInvoice.clientContactPerson &&
              receiptClient?.contactPerson && (
                <p className="mt-1 break-words text-xs text-gray-600">
                  Contact Person: {receiptClient.contactPerson}
                </p>
              )}

            {receiptInvoice.clientPhone && (
              <p className="mt-1 text-xs text-gray-600">
                Phone: {receiptInvoice.clientPhone}
              </p>
            )}

            {receiptInvoice.clientEmail && (
              <p className="mt-1 break-all text-xs text-gray-600">
                Email: {receiptInvoice.clientEmail}
              </p>
            )}

            {receiptInvoice.clientAddress && (
              <p className="mt-1 whitespace-pre-line break-words text-xs text-gray-600">
                Address: {receiptInvoice.clientAddress}
              </p>
            )}

            {receiptInvoice.clientGstNumber && (
              <p className="mt-1 text-xs text-gray-600">
                GSTIN: {receiptInvoice.clientGstNumber}
              </p>
            )}
          </div>

          {/* PAYMENT DETAILS */}

          <div className="mt-5 sm:mt-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              Payment Details
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="w-[35%] border border-gray-800 px-3 py-3 font-medium sm:px-4">
                      Invoice Number
                    </td>

                    <td className="break-all border border-gray-800 px-3 py-3 font-semibold sm:px-4">
                      {receiptInvoice.invoiceNumber}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-3 font-medium sm:px-4">
                      Invoice Date
                    </td>

                    <td className="border border-gray-800 px-3 py-3 sm:px-4">
                      {formatDate(receiptInvoice.invoiceDate)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-3 font-medium sm:px-4">
                      Payment Date
                    </td>

                    <td className="border border-gray-800 px-3 py-3 sm:px-4">
                      {formatDate(receiptPayment.paymentDate)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-3 font-medium sm:px-4">
                      Payment Mode
                    </td>

                    <td className="border border-gray-800 px-3 py-3 sm:px-4">
                      {receiptPayment.paymentMode || "—"}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-3 font-medium sm:px-4">
                      Transaction / Reference No.
                    </td>

                    <td className="break-all border border-gray-800 px-3 py-3 sm:px-4">
                      {receiptPayment.transactionNumber || "—"}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-4 text-sm font-bold sm:px-4">
                      Amount Received
                    </td>

                    <td className="border border-gray-800 px-3 py-4 text-right text-base font-bold text-green-700 sm:px-4 sm:text-lg">
                      {formatCurrency(receiptPayment.amountPaid)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* NOTES */}

          {receiptPayment.notes && (
            <div className="mt-6 border-t border-gray-300 pt-4">
              <h2 className="mb-2 text-xs font-bold text-gray-900">Notes</h2>

              <p className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
                {receiptPayment.notes}
              </p>
            </div>
          )}

          {/* BALANCE */}

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-[390px]">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-gray-800 px-3 py-2 font-medium sm:px-4">
                      Invoice Amount
                    </td>

                    <td className="border border-gray-800 px-3 py-2 text-right font-semibold sm:px-4">
                      {formatCurrency(receiptInvoice.grandTotal)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-2 font-medium sm:px-4">
                      Total Received
                    </td>

                    <td className="border border-gray-800 px-3 py-2 text-right font-semibold text-green-700 sm:px-4">
                      {formatCurrency(receiptSummary.totalPaid)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
                      Outstanding Balance
                    </td>

                    <td className="border border-gray-800 px-3 py-3 text-right text-sm font-bold text-orange-600 sm:px-4">
                      {formatCurrency(receiptSummary.balance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}

          <div className="mt-8 border-t border-gray-300 py-5 text-center sm:mt-10">
            <p className="text-[11px] font-semibold text-gray-700">
              Thank you for your payment.
            </p>

            <p className="mt-1 text-[9px] text-gray-500">
              This payment receipt is system generated.
            </p>
          </div>
        </div>

        {/* PRINT CSS */}

        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 12mm;
              }

              html,
              body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }

              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              body * {
                visibility: hidden;
              }

              #payment-receipt-print,
              #payment-receipt-print * {
                visibility: visible;
              }

              #payment-receipt-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
              }

              .receipt-logo {
                width: 42mm !important;
                height: auto !important;
                max-height: 30mm !important;
                object-fit: contain !important;
                object-position: left top !important;
              }

              table {
                page-break-inside: auto;
              }

              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }

              button,
              nav,
              aside {
                display: none !important;
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* =======================================================
     NORMAL PAYMENTS PAGE
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0">
      {/* PAGE HEADER */}

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Payments
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Track invoice payments, outstanding balances and payment history.
          </p>
        </div>

        <Link
          to="/invoices"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 md:w-auto"
        >
          View Invoices
        </Link>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Invoices"
          value={summary.totalInvoices}
          subtitle="Total invoices"
          icon="🧾"
          accent="border-l-slate-400"
          valueColor="text-slate-900"
        />

        <SummaryCard
          title="Invoice Value"
          value={formatCurrency(summary.totalInvoiceValue)}
          subtitle="Total billed value"
          icon="₹"
          accent="border-l-blue-500"
          valueColor="text-blue-500"
        />

        <SummaryCard
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          subtitle="Amount received"
          icon="✓"
          accent="border-l-green-600"
          valueColor="text-green-600"
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding)}
          subtitle="Amount pending"
          icon="⚠️"
          accent="border-l-amber-500"
          valueColor="text-amber-500"
        />

        <SummaryCard
          title="Fully Paid"
          value={summary.fullyPaid}
          subtitle="Invoices fully paid"
          icon="✓"
          accent="border-l-green-600"
          valueColor="text-green-600"
        />
      </div>

      {/* FILTERS */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice number, client or contact..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "All"
                  | "Pending"
                  | "Partially Paid"
                  | "Paid"
                  | "Overdue",
              )
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Payments</option>

            <option value="Pending">Pending</option>

            <option value="Partially Paid">Partially Paid</option>

            <option value="Paid">Paid</option>

            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          INVOICE PAYMENTS
      ===================================================== */}

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="font-semibold text-slate-900">Invoice Payments</h2>

          <p className="mt-1 text-xs text-slate-500">
            Track received and pending invoice amounts.
          </p>
        </div>

        {paginatedInvoices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mb-2 text-3xl">💰</div>

            <p className="text-sm font-semibold text-slate-700">
              No invoices found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or payment filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F4F7FA]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice Value
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Received
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Balance
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
                  {paginatedInvoices.map((invoice) => {
                    const paymentSummary = getInvoicePaymentSummary(invoice);

                    const paymentStatus = getPaymentStatus(invoice);

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-semibold text-blue-500 hover:text-blue-700 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(invoice.invoiceDate)}
                          </p>
                        </td>

                        <td className="max-w-[240px] px-5 py-3.5">
                          <p
                            className="truncate text-sm font-semibold text-slate-900"
                            title={invoice.clientName}
                          >
                            {invoice.clientName}
                          </p>

                          {invoice.clientPhone && (
                            <p className="mt-1 text-xs text-slate-500">
                              {invoice.clientPhone}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">
                          {formatCurrency(invoice.grandTotal)}
                        </td>

                        <td className="px-5 py-3.5 text-sm font-semibold text-green-600">
                          {formatCurrency(paymentSummary.totalPaid)}
                        </td>

                        <td className="px-5 py-3.5 text-sm font-semibold text-amber-500">
                          {formatCurrency(paymentSummary.balance)}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              paymentStatus,
                            )}`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {paymentSummary.balance > 0 &&
                          invoice.status !== "Cancelled" ? (
                            <button
                              type="button"
                              onClick={() => handleAddPayment(invoice)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              + Add Payment
                            </button>
                          ) : (
                            <Link
                              to={`/invoices/${invoice.id}`}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={invoicePage}
              totalItems={filteredInvoices.length}
              pageSize={PAGE_SIZE}
              onPageChange={setInvoicePage}
            />
          </>
        )}
      </div>

      {/* =====================================================
          PAYMENT HISTORY
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="font-semibold text-slate-900">Payment History</h2>

          <p className="mt-1 text-xs text-slate-500">
            Record of received payments.
          </p>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mb-2 text-3xl">💳</div>

            <p className="text-sm font-semibold text-slate-700">
              No payment history available
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F4F7FA]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mode
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reference
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Proof
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedPaymentHistory.map(({ invoice, payment }) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {formatDate(payment.paymentDate)}
                      </td>

                      <td className="px-5 py-3.5">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="font-semibold text-blue-500 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>

                      <td className="max-w-[220px] px-5 py-3.5 text-sm font-medium text-slate-900">
                        <span
                          className="block truncate"
                          title={invoice.clientName}
                        >
                          {invoice.clientName}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm font-semibold text-green-600">
                        {formatCurrency(payment.amountPaid)}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {payment.paymentMode || "-"}
                      </td>

                      <td className="max-w-[180px] px-5 py-3.5 text-sm text-slate-600">
                        <span
                          className="block truncate"
                          title={payment.transactionNumber || "-"}
                        >
                          {payment.transactionNumber || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {payment.paymentProof ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                invoice,
                                payment,
                              })
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            View Proof
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No Proof
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(invoice, payment)}
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Receipt
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCancelPayment(invoice, payment)
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={historyPage}
              totalItems={paymentHistory.length}
              pageSize={PAGE_SIZE}
              onPageChange={setHistoryPage}
            />
          </>
        )}
      </div>

      {/* =====================================================
          ADD PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal && selectedInvoice && (
        <AddPaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSaved={handlePaymentSaved}
        />
      )}

      {/* =====================================================
          PAYMENT PROOF MODAL
      ===================================================== */}

      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">Payment Proof</h3>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {proofPreview.invoice.invoiceNumber} ·{" "}
                  {proofPreview.invoice.clientName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProofPreview(null)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4 sm:p-5">
              {proofPreview.payment.paymentProof ? (
                <img
                  src={proofPreview.payment.paymentProof}
                  alt="Payment proof"
                  className="mx-auto max-h-[60vh] max-w-full rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No payment proof available.
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => setProofPreview(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
