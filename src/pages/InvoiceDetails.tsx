import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  cancelInvoicePayment,
  getInvoice,
  getInvoicePaymentSummary,
} from "../data/invoiceStore";

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
  if (!value) return "—";

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
      return "bg-green-100 text-green-700";

    case "Partially Paid":
      return "bg-yellow-100 text-yellow-700";

    case "Overdue":
      return "bg-red-100 text-red-700";

    case "Sent":
      return "bg-blue-100 text-blue-700";

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

  const [refreshKey, setRefreshKey] = useState(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);

  const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);

  const [cancellationReason, setCancellationReason] = useState("");

  const [cancelError, setCancelError] = useState("");

  /* =======================================================
     RECEIPT
  ======================================================= */

  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

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

  void refreshKey;

  const payment = getInvoicePaymentSummary(invoice);

  const paymentStatus =
    invoice.status === "Cancelled"
      ? "Cancelled"
      : payment.balance <= 0
        ? "Paid"
        : payment.totalPaid > 0
          ? "Partially Paid"
          : invoice.dueDate &&
              new Date(`${invoice.dueDate}T23:59:59`) < new Date()
            ? "Overdue"
            : "Pending";

  const activePayments = Array.isArray(invoice.payments)
    ? invoice.payments.filter((item) => item.status !== "Cancelled")
    : [];

  const cancelledPayments = Array.isArray(invoice.payments)
    ? invoice.payments.filter((item) => item.status === "Cancelled")
    : [];

  const receiptPayment = activePayments.find(
    (item) => item.id === receiptPaymentId,
  );

  /* =======================================================
     PRINT INVOICE
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
     RECEIPT
  ======================================================= */

  function openReceipt(paymentId: string) {
    setReceiptPaymentId(paymentId);
  }

  function closeReceipt() {
    setReceiptPaymentId(null);
  }

  function printReceipt() {
    window.print();
  }

  /* =======================================================
     OPEN CANCEL PAYMENT
  ======================================================= */

  function openCancelPayment(paymentId: string) {
    setPaymentToCancel(paymentId);
    setCancellationReason("");
    setCancelError("");
    setShowCancelModal(true);
  }

  /* =======================================================
     CLOSE CANCEL PAYMENT
  ======================================================= */

  function closeCancelPayment() {
    setShowCancelModal(false);
    setPaymentToCancel(null);
    setCancellationReason("");
    setCancelError("");
  }

  /* =======================================================
     CONFIRM CANCEL PAYMENT
  ======================================================= */

  function handleCancelPayment() {
    if (!paymentToCancel) {
      return;
    }

    const reason = cancellationReason.trim();

    if (!reason) {
      setCancelError("Please enter a cancellation reason.");
      return;
    }

    try {
      if (!invoiceId) {
        setCancelError("Invoice ID is missing.");
        return;
      }

      const result = cancelInvoicePayment(invoiceId, paymentToCancel, reason);

      if (!result) {
        setCancelError("Payment could not be cancelled.");
        return;
      }

      closeCancelPayment();

      setRefreshKey((value) => value + 1);
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "Payment could not be cancelled.",
      );
    }
  }

  /* =======================================================
     RECEIPT VIEW
  ======================================================= */

  if (receiptPayment) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        {/* SCREEN HEADER */}

        <div className="mx-auto mb-5 flex w-full max-w-[900px] items-center justify-between px-4 print:hidden">
          <button
            type="button"
            onClick={closeReceipt}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back to Invoice
          </button>

          <button
            type="button"
            onClick={printReceipt}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Print Receipt
          </button>
        </div>

        {/* PAYMENT RECEIPT */}

        <div
          id="payment-receipt-print"
          className="mx-auto w-full max-w-[900px] bg-white px-8 py-8 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none"
        >
          {/* HEADER */}

          <div className="border border-gray-300 px-8 py-7">
            <div className="flex items-start justify-between gap-8">
              {/* COMPANY */}

              <div className="flex-1">
                <img
                  src="/images/bharatrath-logo.png"
                  alt="Bharatrath"
                  className="receipt-logo mb-4 h-auto w-[165px] object-contain object-left"
                />

                <p className="text-sm font-medium text-gray-700">
                  Digital Business Solutions
                </p>

                <div className="mt-4 text-[11px] leading-[1.55] text-gray-600">
                  <p className="font-semibold text-gray-800">
                    Ashti Ventures Pvt. Ltd. (Bharatrath)
                  </p>

                  <p>813/801, 8 th Floor, Tower A, WORLD TRADE CENTER,</p>

                  <p>EON Free Zone, Kharadi, Pune, Maharashtra, India</p>

                  <p className="font-semibold">GST No – 27AAQCA3940C1ZR</p>

                  <p>Email – info@bharatrath.com</p>

                  <p>www.bharatrath.com</p>
                </div>
              </div>

              {/* RECEIPT DETAILS */}

              <div className="w-[280px] shrink-0">
                <h1 className="mb-5 text-right text-3xl font-bold uppercase text-gray-900">
                  Payment Receipt
                </h1>

                <table className="w-full text-[12px]">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-500">Receipt No:</td>

                      <td className="py-1 text-right font-semibold text-gray-900">
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

                      <td className="py-1 text-right font-semibold">
                        {invoice.invoiceNumber}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-1 text-gray-500">Payment Mode:</td>

                      <td className="py-1 text-right">
                        {receiptPayment.paymentMode}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RECEIVED FROM */}

          <div className="mt-5 rounded-lg border border-gray-300 px-5 py-5">
            <p className="mb-2 text-[11px] font-semibold uppercase text-gray-500">
              Received From
            </p>

            <p className="text-base font-bold text-gray-900">
              {invoice.clientName}
            </p>

            {invoice.clientContactPerson && (
              <p className="mt-1 text-xs text-gray-600">
                Contact Person: {invoice.clientContactPerson}
              </p>
            )}

            {invoice.clientPhone && (
              <p className="mt-1 text-xs text-gray-600">
                Phone: {invoice.clientPhone}
              </p>
            )}

            {invoice.clientEmail && (
              <p className="mt-1 text-xs text-gray-600">
                Email: {invoice.clientEmail}
              </p>
            )}

            {invoice.clientAddress && (
              <p className="mt-1 whitespace-pre-line text-xs text-gray-600">
                Address: {invoice.clientAddress}
              </p>
            )}

            {invoice.clientGstNumber && (
              <p className="mt-1 text-xs text-gray-600">
                GSTIN: {invoice.clientGstNumber}
              </p>
            )}

            {client && !invoice.clientContactPerson && client.contactPerson && (
              <p className="mt-1 text-xs text-gray-600">
                Contact Person: {client.contactPerson}
              </p>
            )}
          </div>

          {/* PAYMENT DETAILS */}

          <div className="mt-6">
            <h2 className="mb-3 text-base font-bold text-gray-900">
              Payment Details
            </h2>

            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr>
                  <td className="w-[35%] border border-gray-800 px-4 py-3 font-medium">
                    Invoice Number
                  </td>

                  <td className="border border-gray-800 px-4 py-3 font-semibold">
                    {invoice.invoiceNumber}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-3 font-medium">
                    Invoice Date
                  </td>

                  <td className="border border-gray-800 px-4 py-3">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-3 font-medium">
                    Payment Date
                  </td>

                  <td className="border border-gray-800 px-4 py-3">
                    {formatDate(receiptPayment.paymentDate)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-3 font-medium">
                    Payment Mode
                  </td>

                  <td className="border border-gray-800 px-4 py-3">
                    {receiptPayment.paymentMode}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-3 font-medium">
                    Transaction / Reference No.
                  </td>

                  <td className="border border-gray-800 px-4 py-3">
                    {receiptPayment.transactionNumber || "—"}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-4 text-sm font-bold">
                    Amount Received
                  </td>

                  <td className="border border-gray-800 px-4 py-4 text-right text-lg font-bold text-green-700">
                    {currency(receiptPayment.amountPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* NOTES */}

          {receiptPayment.notes && (
            <div className="mt-6 border-t border-gray-300 pt-4">
              <h2 className="mb-2 text-xs font-bold text-gray-900">Notes</h2>

              <p className="whitespace-pre-line text-[10px] leading-5 text-gray-700">
                {receiptPayment.notes}
              </p>
            </div>
          )}

          {/* BALANCE */}

          <div className="mt-6 flex justify-end">
            <table className="w-[390px] border-collapse text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-gray-800 px-4 py-2 font-medium">
                    Invoice Amount
                  </td>

                  <td className="border border-gray-800 px-4 py-2 text-right font-semibold">
                    {currency(invoice.grandTotal)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-2 font-medium">
                    Total Received
                  </td>

                  <td className="border border-gray-800 px-4 py-2 text-right font-semibold text-green-700">
                    {currency(payment.totalPaid)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-4 py-3 text-sm font-bold">
                    Outstanding Balance
                  </td>

                  <td className="border border-gray-800 px-4 py-3 text-right text-sm font-bold text-orange-600">
                    {currency(payment.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FOOTER */}

          <div className="mt-10 border-t border-gray-300 py-5 text-center">
            <p className="text-[11px] font-semibold text-gray-700">
              Thank you for your payment.
            </p>

            <p className="mt-1 text-[9px] text-gray-500">
              This payment receipt is system generated.
            </p>
          </div>
        </div>

        {/* RECEIPT PRINT CSS */}

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

              button,
              nav,
              aside {
                display: none !important;
              }

              .print\\:hidden,
              .no-print {
                display: none !important;
              }

              table {
                page-break-inside: auto;
              }

              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* =======================================================
     NORMAL INVOICE PAGE
  ======================================================= */

  return (
    <div className="space-y-5">
      {/* CRM HEADER */}

      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
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
            ← Back
          </button>

          {invoice.status !== "Cancelled" && (
            <button
              type="button"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
          )}

          {payment.balance > 0 && invoice.status !== "Cancelled" && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              + Add Payment
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Print
          </button>
        </div>
      </div>

      {/* TAX INVOICE DOCUMENT */}

      <div
        id="invoice-print"
        className="
          mx-auto
          w-full
          max-w-[900px]
          bg-white
          shadow-sm
          print:max-w-none
          print:shadow-none
        "
      >
        {/* HEADER */}

        <div className="border border-gray-300 px-8 py-7 print:border-0 print:px-0 print:py-0">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="mb-3">
                <img
                  src="/images/bharatrath-logo.png"
                  alt="Bharatrath"
                  className="invoice-logo h-auto w-[165px] object-contain object-left"
                />
              </div>

              <p className="text-sm font-medium text-gray-700">
                Digital Business Solutions
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Quotation & Business Services
              </p>

              <div className="mt-4 text-[11px] leading-[1.55] text-gray-600">
                <p className="font-semibold text-gray-800">
                  Ashti Ventures Pvt. Ltd. (Bharatrath)
                </p>

                <p>813/801, 8 th Floor, Tower A, WORLD TRADE CENTER,</p>

                <p>EON Free Zone, Kharadi, Pune, Maharashtra, India</p>

                <p className="font-semibold">GST No – 27AAQCA3940C1ZR</p>

                <p>Email – info@bharatrath.com</p>

                <p>www.bharatrath.com</p>
              </div>
            </div>

            <div className="w-[280px] shrink-0">
              <h1 className="mb-4 text-right text-3xl font-bold uppercase text-gray-900">
                Tax Invoice
              </h1>

              <table className="w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-500">Invoice No:</td>

                    <td className="py-1 text-right font-semibold text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Invoice Date:</td>

                    <td className="py-1 text-right">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Due Date:</td>

                    <td className="py-1 text-right">
                      {formatDate(invoice.dueDate)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Status:</td>

                    <td className="py-1 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                          invoice.status,
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BILL TO */}

        <div className="mt-5 rounded-lg border border-gray-300 px-5 py-4 print:mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase text-gray-500">
            Bill To
          </p>

          <p className="text-base font-bold text-gray-900">
            {invoice.clientName}
          </p>

          {invoice.clientContactPerson && (
            <p className="mt-1 text-xs text-gray-600">
              Contact Person: {invoice.clientContactPerson}
            </p>
          )}

          {invoice.clientPhone && (
            <p className="mt-1 text-xs text-gray-600">
              Phone: {invoice.clientPhone}
            </p>
          )}

          {invoice.clientEmail && (
            <p className="mt-1 text-xs text-gray-600">
              Email: {invoice.clientEmail}
            </p>
          )}

          {invoice.clientAddress && (
            <p className="mt-1 whitespace-pre-line text-xs text-gray-600">
              Address: {invoice.clientAddress}
            </p>
          )}

          {invoice.clientGstNumber && (
            <p className="mt-1 text-xs text-gray-600">
              GSTIN: {invoice.clientGstNumber}
            </p>
          )}

          {client && !invoice.clientContactPerson && client.contactPerson && (
            <p className="mt-1 text-xs text-gray-600">
              Contact Person: {client.contactPerson}
            </p>
          )}
        </div>

        {/* RELATED QUOTATION */}

        {(invoice.quotationId || invoice.quotationNumber) && (
          <div className="mt-4 rounded-lg border border-gray-300 px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-500">
                  Related Quotation
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {invoice.quotationNumber ||
                    quotation?.quotationNumber ||
                    "Quotation Reference"}
                </p>

                {quotation?.quotationDate && (
                  <p className="mt-1 text-xs text-gray-600">
                    Quotation Date: {formatDate(quotation.quotationDate)}
                  </p>
                )}
              </div>

              {quotation && (
                <button
                  type="button"
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                  className="text-xs font-semibold text-green-700 hover:underline"
                >
                  View Quotation →
                </button>
              )}
            </div>
          </div>
        )}

        {/* SERVICES */}

        <div className="mt-6">
          <h2 className="mb-3 text-base font-bold text-gray-900">Services</h2>

          <div className="overflow-hidden border border-gray-800">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="w-[6%] border border-gray-800 px-2 py-2 text-center">
                    S.No.
                  </th>

                  <th className="w-[30%] border border-gray-800 px-2 py-2 text-left">
                    Service / Description
                  </th>

                  <th className="w-[10%] border border-gray-800 px-2 py-2 text-center">
                    SAC
                  </th>

                  <th className="w-[14%] border border-gray-800 px-2 py-2 text-right">
                    Basic Cost
                  </th>

                  <th className="w-[12%] border border-gray-800 px-2 py-2 text-right">
                    Discount
                  </th>

                  <th className="w-[16%] border border-gray-800 px-2 py-2 text-right">
                    Final Cost
                  </th>

                  <th className="w-[12%] border border-gray-800 px-2 py-2 text-center">
                    Frequency
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={`${item.id}-${index}`}>
                    <td className="border border-gray-800 px-2 py-3 text-center">
                      {index + 1}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 align-top">
                      <p className="font-semibold text-gray-900">
                        {item.serviceName}
                      </p>

                      {item.description &&
                        item.description !== item.serviceName && (
                          <p className="mt-1 text-[9px] text-gray-600">
                            {item.description}
                          </p>
                        )}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-center">
                      {item.sac || "—"}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-right">
                      {currency(item.basicCost)}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-right">
                      {currency(item.discount)}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-right font-semibold">
                      {currency(item.finalCost)}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-center">
                      {item.frequency || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTALS */}

        <div className="mt-5 flex justify-end">
          <table className="w-[390px] border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="border border-gray-800 px-4 py-2 font-medium">
                  Sub Total
                </td>

                <td className="border border-gray-800 px-4 py-2 text-right font-semibold">
                  {currency(invoice.subtotal)}
                </td>
              </tr>

              <tr>
                <td className="border border-gray-800 px-4 py-2 font-medium">
                  GST ({invoice.tax}%)
                </td>

                <td className="border border-gray-800 px-4 py-2 text-right font-semibold">
                  {currency(invoice.taxAmount)}
                </td>
              </tr>

              <tr>
                <td className="border border-gray-800 px-4 py-3 text-sm font-bold">
                  Amount Payable incl. GST
                </td>

                <td className="border border-gray-800 px-4 py-3 text-right text-sm font-bold text-green-700">
                  {currency(invoice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NOTES */}

        {invoice.notes && (
          <div className="mt-6 border-t border-gray-300 pt-4">
            <h2 className="mb-2 text-xs font-bold text-gray-900">Notes</h2>

            <div className="whitespace-pre-line text-[10px] leading-5 text-gray-700">
              {invoice.notes}
            </div>
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-8 border-t border-gray-300 py-5 text-center">
          <p className="text-[11px] font-semibold text-gray-700">
            Thank you for choosing Bharatrath.
          </p>

          <p className="mt-1 text-[9px] text-gray-500">
            This invoice is system generated.
          </p>
        </div>
      </div>

      {/* PAYMENT SUMMARY */}

      <div className="no-print">
        <div className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold text-gray-900">Payment Summary</h3>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-xs font-medium uppercase text-gray-500">
                Invoice Amount
              </p>

              <p className="mt-1 text-lg font-bold text-gray-900">
                {currency(invoice.grandTotal)}
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-medium uppercase text-gray-500">
                Received
              </p>

              <p className="mt-1 text-lg font-bold text-green-600">
                {currency(payment.totalPaid)}
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-medium uppercase text-gray-500">
                Outstanding
              </p>

              <p className="mt-1 text-lg font-bold text-orange-600">
                {currency(payment.balance)}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Payment Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                    paymentStatus,
                  )}`}
                >
                  {paymentStatus}
                </span>
              </div>

              {invoice.dueDate && (
                <div className="text-right">
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Due Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT HISTORY */}

      {activePayments.length > 0 && (
        <div className="no-print">
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

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {activePayments.map((item) => (
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

                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openReceipt(item.id)}
                            className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Receipt
                          </button>

                          <button
                            type="button"
                            onClick={() => openCancelPayment(item.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
          </div>
        </div>
      )}

      {/* CANCELLED PAYMENTS */}

      {cancelledPayments.length > 0 && (
        <div className="no-print">
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="font-semibold text-gray-900">
                Cancelled Payments
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Cancelled payments are retained for audit history.
              </p>
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

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Reason
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Cancelled On
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {cancelledPayments.map((item) => (
                    <tr key={item.id} className="bg-gray-50/50">
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDate(item.paymentDate)}
                      </td>

                      <td className="px-5 py-3 text-sm text-gray-600">
                        {item.paymentMode}
                      </td>

                      <td className="px-5 py-3 text-right text-sm font-semibold text-gray-500 line-through">
                        {currency(item.amountPaid)}
                      </td>

                      <td className="px-5 py-3 text-sm text-gray-600">
                        {item.cancellationReason || "Payment cancelled"}
                      </td>

                      <td className="px-5 py-3 text-sm text-gray-500">
                        {item.cancelledAt
                          ? new Date(item.cancelledAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL */}

      {showPaymentModal && (
        <div className="no-print">
          <AddPaymentModal
            invoice={invoice}
            onClose={() => setShowPaymentModal(false)}
            onSaved={handlePaymentSaved}
          />
        </div>
      )}

      {/* CANCEL PAYMENT MODAL */}

      {showCancelModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cancel Payment
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                This payment will not be deleted. It will be marked as cancelled
                and retained in the payment history.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              {cancelError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cancellation Reason
                </label>

                <textarea
                  value={cancellationReason}
                  onChange={(event) => {
                    setCancellationReason(event.target.value);
                    setCancelError("");
                  }}
                  rows={4}
                  autoFocus
                  placeholder="Enter reason for cancelling this payment..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeCancelPayment}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Payment
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

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

            #invoice-print,
            #invoice-print * {
              visibility: visible;
            }

            #invoice-print {
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

            .invoice-logo {
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

            h1,
            h2 {
              page-break-after: avoid;
            }

            button,
            nav,
            aside {
              display: none !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}
