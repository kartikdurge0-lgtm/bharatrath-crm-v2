import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  acceptQuotation,
  getQuotation,
  markQuotationAsSent,
  rejectQuotation,
  type Quotation,
} from "../data/quotationStore";

import {
  getInvoiceByQuotationReference,
  type Invoice,
} from "../data/invoiceStore";

import { getLead, type Lead } from "../data/leadStore";
import { getClientById } from "../data/clientStore";

export default function QuotationDetails() {
  const navigate = useNavigate();
  const { quotationId } = useParams();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingQuotation, setLoadingQuotation] = useState(true);
  const [loadingLead, setLoadingLead] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | undefined>(
    undefined,
  );

  useEffect(() => {
    let mounted = true;

    async function loadQuotation() {
      if (!quotationId) {
        if (mounted) {
          setQuotation(null);
          setLoadingQuotation(false);
        }
        return;
      }

      setLoadingQuotation(true);

      try {
        const result = await getQuotation(quotationId);

        if (mounted) {
          setQuotation(result);
        }
      } catch (error) {
        console.error("Failed to load quotation:", error);

        if (mounted) {
          setQuotation(null);
        }
      } finally {
        if (mounted) {
          setLoadingQuotation(false);
        }
      }
    }

    void loadQuotation();

    return () => {
      mounted = false;
    };
  }, [quotationId]);

  useEffect(() => {
    if (!quotation) {
      setExistingInvoice(undefined);
      return;
    }

    const invoice = getInvoiceByQuotationReference(
      quotation.id,
      quotation.quotationNumber,
    );

    setExistingInvoice(invoice);
  }, [quotation]);

  useEffect(() => {
    let mounted = true;

    async function loadLead() {
      if (!quotation?.leadId) {
        if (mounted) {
          setLead(null);
          setLoadingLead(false);
        }
        return;
      }

      setLoadingLead(true);

      try {
        const result = await getLead(quotation.leadId);

        if (mounted) {
          setLead(result);
        }
      } catch (error) {
        console.error("Failed to load related lead:", error);

        if (mounted) {
          setLead(null);
        }
      } finally {
        if (mounted) {
          setLoadingLead(false);
        }
      }
    }

    void loadLead();

    return () => {
      mounted = false;
    };
  }, [quotation]);

  const client = quotation?.clientId
    ? getClientById(quotation.clientId)
    : undefined;

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

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

  function statusClass(status: string) {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700";

      case "Sent":
        return "bg-blue-100 text-blue-700";

      case "Rejected":
        return "bg-red-100 text-red-700";

      case "Expired":
        return "bg-orange-100 text-orange-700";

      case "Draft":
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function handleMarkSent() {
    if (!quotation) return;

    markQuotationAsSent(quotation.id);
    window.location.reload();
  }

  function handleAccept() {
    if (!quotation) return;

    const confirmed = window.confirm(
      `Mark quotation ${quotation.quotationNumber} as Accepted?`,
    );

    if (!confirmed) return;

    acceptQuotation(quotation.id);
    window.location.reload();
  }

  function handleReject() {
    if (!quotation) return;

    const confirmed = window.confirm(
      `Mark quotation ${quotation.quotationNumber} as Rejected?`,
    );

    if (!confirmed) return;

    rejectQuotation(quotation.id);
    window.location.reload();
  }

  function handleInvoiceAction() {
    if (!quotation) return;

    // Existing invoice -> open it instead of creating another invoice.
    if (existingInvoice) {
      navigate(`/invoices/${existingInvoice.id}`);
      return;
    }

    // Only Accepted quotations can create an invoice.
    if (quotation.status !== "Accepted") {
      return;
    }

    navigate(`/add-invoice?quotationId=${quotation.id}`);
  }

  if (loadingQuotation) {
    return (
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Quotation Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Loading quotation information...
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            ← Back to Quotations
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Quotation Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">Quotation information</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            ← Back to Quotations
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Quotation Not Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            The requested quotation could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="mt-6 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            ← Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
      {/* =====================================================
          CRM HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Quotation Details
          </h1>

          <p className="mt-1 truncate text-sm text-gray-500">
            {quotation.quotationNumber}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Print
          </button>
        </div>
      </div>

      {/* =====================================================
          CRM CONTEXT
      ===================================================== */}

      <div className="grid min-w-0 grid-cols-1 gap-4 print:hidden md:grid-cols-3">
        {/* CLIENT */}

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Client
          </p>

          <p
            className="mt-2 truncate text-base font-semibold text-gray-900"
            title={quotation.clientName}
          >
            {quotation.clientName}
          </p>

          <p className="mt-1 truncate text-xs text-gray-500">
            {quotation.clientId}
          </p>

          {client?.contactPerson && (
            <p
              className="mt-2 truncate text-sm text-gray-600"
              title={client.contactPerson}
            >
              {client.contactPerson}
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate(`/clients/${quotation.clientId}`)}
            className="mt-3 text-xs font-semibold text-green-700 hover:underline"
          >
            View Client →
          </button>
        </div>

        {/* LEAD */}

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Related Lead
          </p>

          {loadingLead ? (
            <p className="mt-2 text-sm text-gray-500">Loading lead...</p>
          ) : lead ? (
            <>
              <p
                className="mt-2 truncate text-base font-semibold text-gray-900"
                title={lead.companyName}
              >
                {lead.companyName}
              </p>

              <p className="mt-1 truncate text-xs text-gray-500">{lead.id}</p>

              <p className="mt-2 truncate text-sm text-gray-600">
                Status: {lead.status}
              </p>

              <button
                type="button"
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="mt-3 text-xs font-semibold text-green-700 hover:underline"
              >
                View Lead →
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Direct client quotation
            </p>
          )}
        </div>

        {/* SALES PERSON */}

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Sales Person
          </p>

          <p
            className="mt-2 truncate text-base font-semibold text-gray-900"
            title={quotation.salesPersonName || "Not assigned"}
          >
            {quotation.salesPersonName || "Not assigned"}
          </p>

          {quotation.salesPersonId && (
            <p className="mt-1 truncate text-xs text-gray-500">
              {quotation.salesPersonId}
            </p>
          )}
        </div>
      </div>

      {/* =====================================================
          STATUS ACTIONS
      ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Current Status
            </p>

            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                quotation.status,
              )}`}
            >
              {quotation.status}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {quotation.status === "Draft" && (
              <button
                type="button"
                onClick={handleMarkSent}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
              >
                Mark as Sent
              </button>
            )}

            {(quotation.status === "Draft" || quotation.status === "Sent") && (
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
                >
                  Accept Quotation
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
                >
                  Reject
                </button>
              </>
            )}

            {quotation.status === "Accepted" && (
              <button
                type="button"
                onClick={handleInvoiceAction}
                className={`w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white sm:w-auto ${
                  existingInvoice
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {existingInvoice ? "View Invoice" : "Create Invoice"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          QUOTATION DOCUMENT
      ===================================================== */}

      <div
        id="quotation-print"
        className="
          mx-auto
          w-full
          max-w-[900px]
          min-w-0
          bg-white
          shadow-sm
          print:max-w-none
          print:shadow-none
        "
      >
        {/* =================================================
            DOCUMENT HEADER
        ================================================= */}

        <div className="border border-gray-300 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 print:border-0 print:px-0 print:py-0">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-3">
                <img
                  src="/images/bharatrath-logo.png"
                  alt="Bharatrath"
                  className="quotation-logo h-auto w-[145px] max-w-full object-contain object-left sm:w-[165px]"
                />
              </div>

              <p className="text-sm font-medium text-gray-700">
                Digital Business Solutions
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Quotation & Business Services
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

            <div className="w-full shrink-0 md:w-[280px]">
              <h1 className="mb-4 text-left text-2xl font-bold uppercase text-gray-900 sm:text-3xl md:text-right">
                Quotation
              </h1>

              <table className="w-full text-[11px] sm:text-[12px]">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-500">Quotation No:</td>

                    <td className="break-words py-1 text-right font-semibold text-gray-900">
                      {quotation.quotationNumber}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Quotation Date:</td>

                    <td className="py-1 text-right">
                      {formatDate(quotation.quotationDate)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Valid Until:</td>

                    <td className="py-1 text-right">
                      {formatDate(quotation.validUntil)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 text-gray-500">Status:</td>

                    <td className="py-1 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                          quotation.status,
                        )}`}
                      >
                        {quotation.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* =================================================
            QUOTATION FOR
        ================================================= */}

        <div className="mt-4 rounded-lg border border-gray-300 px-4 py-4 sm:mt-5 sm:px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase text-gray-500">
            Quotation For
          </p>

          <p
            className="break-words text-base font-bold text-gray-900"
            title={quotation.clientName}
          >
            {quotation.clientName}
          </p>

          <p className="mt-1 text-xs text-gray-600">
            Client ID: {quotation.clientId}
          </p>

          {client?.contactPerson && (
            <p className="mt-1 break-words text-xs text-gray-600">
              Contact Person: {client.contactPerson}
            </p>
          )}

          {client?.phone && (
            <p className="mt-1 break-words text-xs text-gray-600">
              Phone: {client.phone}
            </p>
          )}

          {client?.email && (
            <p className="mt-1 break-all text-xs text-gray-600">
              Email: {client.email}
            </p>
          )}
        </div>

        {/* =================================================
            SERVICES
        ================================================= */}

        <div className="mt-5 sm:mt-6">
          <h2 className="mb-3 text-base font-bold text-gray-900">Services</h2>

          <div className="overflow-x-auto border border-gray-800">
            <table className="w-full min-w-[720px] border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="w-[6%] border border-gray-800 px-2 py-2 text-center">
                    S.No.
                  </th>

                  <th className="w-[31%] border border-gray-800 px-2 py-2 text-left">
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

                  <th className="w-[15%] border border-gray-800 px-2 py-2 text-right">
                    Final Cost
                  </th>

                  <th className="w-[12%] border border-gray-800 px-2 py-2 text-center">
                    Frequency
                  </th>
                </tr>
              </thead>

              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={`${item.serviceId}-${index}`}>
                    <td className="border border-gray-800 px-2 py-3 text-center">
                      {index + 1}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 align-top">
                      <p className="break-words font-semibold text-gray-900">
                        {item.description || "Service"}
                      </p>
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-center">
                      {item.sac || "—"}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-right">
                      {currency(item.basicCost)}
                    </td>

                    <td className="border border-gray-800 px-2 py-3 text-right">
                      {currency(item.discountedCost || 0)}
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

        {/* =================================================
            TOTALS
        ================================================= */}

        <div className="mt-5 flex justify-end">
          <div className="w-full sm:w-[390px]">
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-gray-800 px-3 py-2 font-medium sm:px-4">
                    Sub Total
                  </td>

                  <td className="border border-gray-800 px-3 py-2 text-right font-semibold sm:px-4">
                    {currency(quotation.subtotal)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-3 py-2 font-medium sm:px-4">
                    GST ({quotation.tax}%)
                  </td>

                  <td className="border border-gray-800 px-3 py-2 text-right font-semibold sm:px-4">
                    {currency(quotation.taxAmount)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
                    Grand Total
                  </td>

                  <td className="border border-gray-800 px-3 py-3 text-right text-sm font-bold text-green-700 sm:px-4">
                    {currency(quotation.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* =================================================
            IMPLEMENTATION
        ================================================= */}

        {quotation.implementationProcess && (
          <div className="mt-5 border-t border-gray-300 pt-4 sm:mt-6">
            <h2 className="mb-2 text-xs font-bold text-gray-900">
              Implementation Process
            </h2>

            <div className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
              {quotation.implementationProcess}
            </div>
          </div>
        )}

        {/* =================================================
            SUPPORT
        ================================================= */}

        {quotation.supportTraining && (
          <div className="mt-5 border-t border-gray-300 pt-4">
            <h2 className="mb-2 text-xs font-bold text-gray-900">
              Post Sales Support & Training
            </h2>

            <div className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
              {quotation.supportTraining}
            </div>
          </div>
        )}

        {/* =================================================
            SCOPE
        ================================================= */}

        {quotation.scopeOfWork && (
          <div className="mt-5 border-t border-gray-300 pt-4">
            <h2 className="mb-2 text-xs font-bold text-gray-900">
              Scope of Work
            </h2>

            <div className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
              {quotation.scopeOfWork}
            </div>
          </div>
        )}

        {/* =================================================
            REMARKS
        ================================================= */}

        {quotation.remarks && (
          <div className="mt-5 border-t border-gray-300 pt-4">
            <h2 className="mb-2 text-xs font-bold text-gray-900">Remarks</h2>

            <div className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
              {quotation.remarks}
            </div>
          </div>
        )}

        {/* =================================================
            TERMS
        ================================================= */}

        {quotation.termsConditions && (
          <div className="mt-5 border-t border-gray-300 pt-4">
            <h2 className="mb-2 text-xs font-bold text-gray-900">
              Terms & Conditions
            </h2>

            <div className="whitespace-pre-line break-words text-[10px] leading-5 text-gray-700">
              {quotation.termsConditions}
            </div>
          </div>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-8 border-t border-gray-300 py-5 text-center">
          <p className="text-[11px] font-semibold text-gray-700">
            Thank you for choosing Bharatrath.
          </p>

          <p className="mt-1 text-[9px] text-gray-500">
            This quotation is system generated.
          </p>
        </div>
      </div>

      {/* =====================================================
          BOTTOM ACTIONS
      ===================================================== */}

      <div className="flex flex-col gap-2 pb-8 print:hidden sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 sm:pb-10">
        <button
          type="button"
          onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
          className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          Edit Quotation
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
        >
          Print Quotation
        </button>

        {quotation.status === "Accepted" && (
          <button
            type="button"
            onClick={handleInvoiceAction}
            className={`w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white sm:w-auto ${
              existingInvoice
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {existingInvoice ? "View Invoice" : "Create Invoice"}
          </button>
        )}
      </div>

      {/* =====================================================
          PRINT CSS
      ===================================================== */}

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

            #quotation-print,
            #quotation-print * {
              visibility: visible;
            }

            #quotation-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: none !important;
              min-width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              box-shadow: none !important;
            }

            .quotation-logo {
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
          }
        `}
      </style>
    </div>
  );
}
