import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getInvoice, getInvoicePaymentSummary } from "../data/invoiceStore";

import { getClientById } from "../data/clientStore";
import { getQuotation } from "../data/quotationStore";

import AddPaymentModal from "../components/AddPaymentModal";

/* =========================================================
   CURRENCY
========================================================= */

function currency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value?: string) {
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

/* =========================================================
   STATUS
========================================================= */

function statusClass(status: string) {
  switch (status) {
    case "Paid":
      return "bg-green-50 text-green-700";

    case "Partially Paid":
      return "bg-yellow-50 text-yellow-700";

    case "Overdue":
      return "bg-red-50 text-red-700";

    case "Sent":
      return "bg-blue-50 text-blue-700";

    case "Cancelled":
      return "bg-gray-100 text-gray-600";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

/* =========================================================
   MAIN
========================================================= */

export default function InvoiceDetails() {
  const navigate = useNavigate();

  const { invoiceId } = useParams();

  /*
   * Refresh counter is used after a payment is saved.
   * This causes the invoice/payment summary to be read again
   * from localStorage.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const invoice = invoiceId ? getInvoice(invoiceId) : null;

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!invoice) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice Not Found
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The requested invoice could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  /* =======================================================
     CLIENT
  ======================================================= */

  const client = invoice.clientId ? getClientById(invoice.clientId) : undefined;

  /* =======================================================
     QUOTATION
  ======================================================= */

  const quotation = invoice.quotationId
    ? getQuotation(invoice.quotationId)
    : null;

  /* =======================================================
     PAYMENT
  ======================================================= */

  /*
   * refreshKey intentionally participates in this calculation.
   * The value changes after saving a payment.
   */
  void refreshKey;

  const payment = getInvoicePaymentSummary(invoice);

  const paymentStatus =
    payment.balance <= 0
      ? "Paid"
      : payment.totalPaid > 0
        ? "Partially Paid"
        : invoice.dueDate &&
            new Date(invoice.dueDate) < new Date() &&
            invoice.status !== "Cancelled"
          ? "Overdue"
          : "Pending";

  /* =======================================================
     PRINT
  ======================================================= */

  function handlePrint() {
    window.print();
  }

  /* =======================================================
     PAYMENT SAVED
  ======================================================= */

  function handlePaymentSaved() {
    setShowPaymentModal(false);
    setRefreshKey((value) => value + 1);
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="space-y-5">
      {/* ===================================================
          PAGE HEADER — SCREEN ONLY
      =================================================== */}

      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>

          <p className="mt-1 text-sm text-gray-500">
            Invoice No. {invoice.invoiceNumber}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>

          {payment.balance > 0 && invoice.status !== "Cancelled" && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              + Add Payment
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Print
          </button>
        </div>
      </div>

      {/* ===================================================
          CRM RELATIONSHIPS — SCREEN ONLY
      =================================================== */}

      {(client || quotation) && (
        <div className="no-print grid grid-cols-1 gap-4 md:grid-cols-2">
          {client && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Client
                  </p>

                  <h3 className="mt-1 font-semibold text-gray-900">
                    {client.company || invoice.clientName}
                  </h3>

                  {client.contactPerson && (
                    <p className="mt-1 text-sm text-gray-600">
                      {client.contactPerson}
                    </p>
                  )}

                  {client.phone && (
                    <p className="mt-1 text-sm text-gray-500">{client.phone}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/clients/${invoice.clientId}`)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Client
                </button>
              </div>
            </div>
          )}

          {quotation && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Related Quotation
                  </p>

                  <h3 className="mt-1 font-semibold text-gray-900">
                    {quotation.quotationNumber}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(quotation.quotationDate)}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                      quotation.status,
                    )}`}
                  >
                    {quotation.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Quotation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          PAYMENT SUMMARY — SCREEN ONLY
      =================================================== */}

      <div className="no-print rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Payment Summary</h3>

            <p className="mt-1 text-xs text-gray-500">
              Current payment status for this invoice
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
              paymentStatus,
            )}`}
          >
            {paymentStatus}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Invoice Amount</p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {currency(invoice.grandTotal)}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs text-gray-500">Total Received</p>

            <p className="mt-1 text-lg font-bold text-green-700">
              {currency(payment.totalPaid)}
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-xs text-gray-500">Outstanding</p>

            <p className="mt-1 text-lg font-bold text-red-700">
              {currency(payment.balance)}
            </p>
          </div>
        </div>

        {invoice.dueDate && (
          <div className="mt-4 text-sm text-gray-500">
            Due Date:{" "}
            <span className="font-medium text-gray-700">
              {formatDate(invoice.dueDate)}
            </span>
          </div>
        )}
      </div>

      {/* ===================================================
          INVOICE DOCUMENT
      =================================================== */}

      <div className="invoice-print-area rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* HEADER */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-green-600">Bharatrath</h1>

              <p className="text-sm font-medium text-gray-700">
                Digital Business Solutions
              </p>

              <p className="text-sm text-gray-500">
                Quotation & Business Services
              </p>

              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">
                  Ashti Ventures Pvt. Ltd. (Bharatrath)
                </p>

                <p>Dynamic Grand Stand II</p>

                <p>Office No-108, Opposite Forest County Gate No.3</p>

                <p>Kharadi, Pune, Maharashtra, India</p>

                <p>GST No – 27AAQCA3940C1ZR</p>

                <p>info@bharatrath.com</p>

                <p>www.bharatrath.com</p>
              </div>
            </div>

            <div className="md:text-right">
              <h2 className="text-3xl font-bold text-gray-900">TAX INVOICE</h2>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex gap-4 md:justify-end">
                  <span className="text-gray-500">Invoice No:</span>

                  <span className="font-semibold text-gray-900">
                    {invoice.invoiceNumber}
                  </span>
                </div>

                {invoice.quotationNumber && (
                  <div className="flex gap-4 md:justify-end">
                    <span className="text-gray-500">Quotation:</span>

                    <span className="font-semibold text-gray-900">
                      {invoice.quotationNumber}
                    </span>
                  </div>
                )}

                <div className="flex gap-4 md:justify-end">
                  <span className="text-gray-500">Invoice Date:</span>

                  <span className="font-semibold text-gray-900">
                    {formatDate(invoice.invoiceDate)}
                  </span>
                </div>

                {invoice.dueDate && (
                  <div className="flex gap-4 md:justify-end">
                    <span className="text-gray-500">Due Date:</span>

                    <span className="font-semibold text-gray-900">
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 md:justify-end">
                  <span className="text-gray-500">Status:</span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                      paymentStatus,
                    )}`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BILL TO */}
        <div className="p-6">
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
              Bill To
            </h3>

            <div className="space-y-1 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">
                {invoice.clientName}
              </p>

              {invoice.clientContactPerson && (
                <p>Contact Person: {invoice.clientContactPerson}</p>
              )}

              {invoice.clientPhone && <p>Phone: {invoice.clientPhone}</p>}

              {invoice.clientEmail && <p>Email: {invoice.clientEmail}</p>}

              {invoice.clientAddress && <p>Address: {invoice.clientAddress}</p>}

              {invoice.clientGstNumber && (
                <p>GSTIN: {invoice.clientGstNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* SERVICES */}
        <div className="px-6 pb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Services</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-green-600 text-left text-xs font-semibold uppercase text-white">
                  <th className="border border-green-700 px-3 py-3">S.No.</th>

                  <th className="border border-green-700 px-3 py-3">
                    Service / Product Description
                  </th>

                  <th className="border border-green-700 px-3 py-3">SAC</th>

                  <th className="border border-green-700 px-3 py-3 text-right">
                    Basic Cost
                  </th>

                  <th className="border border-green-700 px-3 py-3 text-right">
                    Discount
                  </th>

                  <th className="border border-green-700 px-3 py-3 text-right">
                    Final Cost
                  </th>

                  <th className="border border-green-700 px-3 py-3">
                    Frequency
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-3 py-3 text-sm">
                      {index + 1}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {item.serviceName}
                      </p>

                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500">
                          {item.description}
                        </p>
                      )}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-sm">
                      {item.sac || "—"}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-right text-sm">
                      {currency(item.basicCost)}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-right text-sm">
                      {currency(item.discount)}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-right text-sm font-semibold">
                      {currency(item.finalCost)}
                    </td>

                    <td className="border border-gray-300 px-3 py-3 text-sm">
                      {item.frequency || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end px-6 pb-6">
          <div className="w-full max-w-md rounded-lg border border-gray-200">
            <div className="flex justify-between border-b border-gray-200 px-4 py-3 text-sm">
              <span className="text-gray-600">Sub Total</span>

              <span className="font-semibold text-gray-900">
                {currency(invoice.subtotal)}
              </span>
            </div>

            <div className="flex justify-between border-b border-gray-200 px-4 py-3 text-sm">
              <span className="text-gray-600">GST ({invoice.tax}%)</span>

              <span className="font-semibold text-gray-900">
                {currency(invoice.taxAmount)}
              </span>
            </div>

            <div className="flex justify-between px-4 py-4">
              <span className="font-bold text-gray-900">
                Amount Payable incl. GST
              </span>

              <span className="font-bold text-green-600">
                {currency(invoice.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {invoice.notes && (
          <div className="px-6 pb-6">
            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="mb-2 font-semibold text-gray-900">Notes</h3>

              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {invoice.notes}
              </p>
            </div>
          </div>
        )}

        {/* PAYMENT HISTORY */}
        {invoice.payments.length > 0 && (
          <div className="no-print px-6 pb-6">
            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="font-semibold text-gray-900">Payment History</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        Mode
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        Reference
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {invoice.payments
                      .filter((item) => item.status !== "Cancelled")
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="px-5 py-3 text-sm text-gray-700">
                            {formatDate(item.paymentDate)}
                          </td>

                          <td className="px-5 py-3 text-sm text-gray-700">
                            {item.paymentMode}
                          </td>

                          <td className="px-5 py-3 text-sm text-gray-600">
                            {item.transactionNumber || "—"}
                          </td>

                          <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">
                            {currency(item.amountPaid)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="border-t border-gray-200 px-6 py-5 text-center">
          <p className="font-semibold text-gray-700">
            Thank you for choosing Bharatrath.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            This invoice is system generated.
          </p>
        </div>
      </div>

      {/* ===================================================
          ADD PAYMENT MODAL
      =================================================== */}

      {showPaymentModal && (
        <div className="no-print">
          <AddPaymentModal
            invoice={invoice}
            onClose={() => setShowPaymentModal(false)}
            onSaved={handlePaymentSaved}
          />
        </div>
      )}

      {/* ===================================================
          PRINT CSS
      =================================================== */}

      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .invoice-print-area {
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }

            @page {
              size: A4;
              margin: 12mm;
            }
          }
        `}
      </style>
    </div>
  );
}
