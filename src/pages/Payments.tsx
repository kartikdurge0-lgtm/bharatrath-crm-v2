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

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(date);

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

  if (paymentSummary.balance <= 0) {
    return "Paid";
  }

  if (paymentSummary.totalPaid > 0) {
    return "Partially Paid";
  }

  if (
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    invoice.status !== "Cancelled"
  ) {
    return "Overdue";
  }

  return "Pending";
}

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
      className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md ${accent}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#334155]">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
          {icon}
        </span>
      </div>

      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>

      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
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
     FILTERED INVOICES
  ======================================================= */

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
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
    return invoices
      .flatMap((invoice) =>
        invoice.payments
          .filter((payment) => payment.status !== "Cancelled")
          .map((payment) => ({
            invoice,
            payment,
          })),
      )
      .sort(
        (a, b) =>
          new Date(b.payment.paymentDate).getTime() -
          new Date(a.payment.paymentDate).getTime(),
      );
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
     CANCEL PAYMENT
  ======================================================= */

  const handleCancelPayment = (invoice: Invoice, payment: InvoicePayment) => {
    const reason = window.prompt("Enter reason for cancelling this payment:");

    if (reason === null) {
      return;
    }

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

    if (!confirmed) {
      return;
    }

    const result = cancelInvoicePayment(invoice.id, payment.id, trimmedReason);

    if (!result) {
      window.alert("Unable to cancel the payment.");
      return;
    }

    loadInvoices();
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-7xl">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>

          <p className="mt-1 text-sm text-slate-500">
            Track invoice payments, outstanding balances and payment history.
          </p>
        </div>

        <Link
          to="/invoices"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          View Invoices
        </Link>
      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard
          title="Total Invoices"
          value={summary.totalInvoices}
          subtitle="Total invoices"
          icon="🧾"
          accent="border-l-[#94A3B8]"
          valueColor="text-slate-900"
        />

        <SummaryCard
          title="Invoice Value"
          value={formatCurrency(summary.totalInvoiceValue)}
          subtitle="Total billed value"
          icon="₹"
          accent="border-l-[#3B82F6]"
          valueColor="text-[#3B82F6]"
        />

        <SummaryCard
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          subtitle="Amount received"
          icon="✓"
          accent="border-l-[#16A34A]"
          valueColor="text-[#16A34A]"
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding)}
          subtitle="Amount pending"
          icon="⚠️"
          accent="border-l-[#F59E0B]"
          valueColor="text-[#F59E0B]"
        />

        <SummaryCard
          title="Fully Paid"
          value={summary.fullyPaid}
          subtitle="Invoices fully paid"
          icon="✓"
          accent="border-l-[#16A34A]"
          valueColor="text-[#16A34A]"
        />
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice number, client or contact..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
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
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Payments</option>

            <option value="Pending">Pending</option>

            <option value="Partially Paid">Partially Paid</option>

            <option value="Paid">Paid</option>

            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* =================================================
          INVOICE PAYMENTS
      ================================================= */}

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
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
              <table className="min-w-[1050px] w-full">
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
                        {/* Invoice */}

                        <td className="px-5 py-3.5">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-semibold text-[#3B82F6] hover:text-blue-700 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(invoice.invoiceDate)}
                          </p>
                        </td>

                        {/* Client */}

                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {invoice.clientName}
                          </p>

                          {invoice.clientPhone && (
                            <p className="mt-1 text-xs text-slate-500">
                              {invoice.clientPhone}
                            </p>
                          )}
                        </td>

                        {/* Invoice Value */}

                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">
                          {formatCurrency(invoice.grandTotal)}
                        </td>

                        {/* Received */}

                        <td className="px-5 py-3.5 text-sm font-semibold text-[#16A34A]">
                          {formatCurrency(paymentSummary.totalPaid)}
                        </td>

                        {/* Balance */}

                        <td className="px-5 py-3.5 text-sm font-semibold text-[#F59E0B]">
                          {formatCurrency(paymentSummary.balance)}
                        </td>

                        {/* Status */}

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              paymentStatus,
                            )}`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        {/* Action */}

                        <td className="px-5 py-3.5 text-right">
                          {paymentSummary.balance > 0 &&
                          invoice.status !== "Cancelled" ? (
                            <button
                              type="button"
                              onClick={() => handleAddPayment(invoice)}
                              className="rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15803D]"
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

      {/* =================================================
          PAYMENT HISTORY
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
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
              <table className="min-w-[1050px] w-full">
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
                          className="font-semibold text-[#3B82F6] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>

                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                        {invoice.clientName}
                      </td>

                      <td className="px-5 py-3.5 text-sm font-semibold text-[#16A34A]">
                        {formatCurrency(payment.amountPaid)}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {payment.paymentMode || "-"}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {payment.transactionNumber || "-"}
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
                        <button
                          type="button"
                          onClick={() => handleCancelPayment(invoice, payment)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Cancel
                        </button>
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

      {/* =================================================
          ADD PAYMENT MODAL
      ================================================= */}

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

      {/* =================================================
          PAYMENT PROOF MODAL
      ================================================= */}

      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">Payment Proof</h3>

                <p className="mt-1 text-xs text-slate-500">
                  {proofPreview.invoice.invoiceNumber} ·{" "}
                  {proofPreview.invoice.clientName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProofPreview(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Image */}

            <div className="max-h-[70vh] overflow-auto p-5">
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

            {/* Footer */}

            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
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
