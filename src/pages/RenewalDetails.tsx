import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  archiveRenewal,
  completeRenewalInSupabase,
  getRenewalFromSupabase,
  type Renewal,
} from "../data/renewalStore";

import {
  createInvoice,
  getInvoiceByRenewalId,
  getInvoicePaymentSummary,
  type Invoice,
} from "../data/invoiceStore";

import { getInvoiceSettings } from "../data/settingsStore";

import AddPaymentModal from "../components/AddPaymentModal";

export default function RenewalDetails() {
  const navigate = useNavigate();
  const { renewalId } = useParams();

  const [renewal, setRenewal] = useState<Renewal | null>(null);

  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | undefined>(
    undefined,
  );

  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentRefresh, setPaymentRefresh] = useState(0);

  const [archiving, setArchiving] = useState(false);

  /* =========================================================
     LOAD RENEWAL
  ========================================================= */

  useEffect(() => {
    if (!renewalId) {
      return;
    }

    let mounted = true;

    const loadData = async () => {
      try {
        const existing = await getRenewalFromSupabase(renewalId);

        if (!mounted) {
          return;
        }

        setRenewal(existing);

        if (existing) {
          const invoice = await getInvoiceByRenewalId(existing.id);

          if (mounted) {
            setGeneratedInvoice(invoice);
          }
        }
      } catch (error) {
        console.error("Failed to load renewal:", error);

        if (mounted) {
          setRenewal(null);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [renewalId]);

  /* =========================================================
     REFRESH GENERATED INVOICE
  ========================================================= */

  const refreshInvoice = async () => {
    if (!renewal) {
      return;
    }

    try {
      const invoice = await getInvoiceByRenewalId(renewal.id);

      setGeneratedInvoice(invoice);
      setPaymentRefresh((value) => value + 1);
    } catch (error) {
      console.error("Failed to refresh invoice:", error);
    }
  };

  /* =========================================================
     COMPLETE RENEWAL
  ========================================================= */

  const handleComplete = async () => {
    if (!renewal) {
      return;
    }

    const confirmed = window.confirm(
      `Mark "${renewal.service}" renewal for "${renewal.clientName}" as completed?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const updated = await completeRenewalInSupabase(renewal.id);

      if (updated) {
        setRenewal(updated);
      } else {
        window.alert("Renewal could not be completed.");
      }
    } catch (error) {
      console.error("Failed to complete renewal:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to complete renewal. Please try again.",
      );
    }
  };

  /* =========================================================
     ARCHIVE RENEWAL
     ---------------------------------------------------------
     IMPORTANT:
     No permanent delete.
     Archive only.
  ========================================================= */

  const handleArchive = async () => {
    if (!renewal) {
      return;
    }

    const confirmed = window.confirm(
      `Archive "${renewal.service}" renewal for "${renewal.clientName}"?\n\n` +
        `The renewal will be removed from active renewals but will remain available in Archived Renewals.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setArchiving(true);

      const success = await archiveRenewal(renewal.id);

      if (!success) {
        window.alert("Renewal could not be archived.");
        return;
      }

      window.alert("Renewal archived successfully.");

      navigate("/renewals");
    } catch (error) {
      console.error("Failed to archive renewal:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to archive renewal. Please try again.",
      );
    } finally {
      setArchiving(false);
    }
  };

  /* =========================================================
     GENERATE INVOICE
     IMPORTANT:
     createInvoice() is the source of truth
     for final invoice numbering.
  ========================================================= */

  const handleGenerateInvoice = async () => {
    if (!renewal) {
      return;
    }

    try {
      const existingInvoice = await getInvoiceByRenewalId(renewal.id);

      if (existingInvoice) {
        setGeneratedInvoice(existingInvoice);

        window.alert(
          `Invoice already exists: ${existingInvoice.invoiceNumber}`,
        );

        return;
      }

      const confirmed = window.confirm(
        `Generate invoice for "${renewal.service}" renewal of "${renewal.clientName}" for ₹${renewal.amount.toLocaleString(
          "en-IN",
        )}?`,
      );

      if (!confirmed) {
        return;
      }

      setGeneratingInvoice(true);

      const invoiceSettings = getInvoiceSettings();

      const invoiceDate = new Date();

      const dueDate = getDueDate(invoiceSettings.paymentTerms);

      /*
       * createInvoice() generates the final
       * renewal invoice number.
       *
       * Do NOT manually generate or increment
       * the renewal invoice serial here.
       */

      const invoice = await createInvoice({
        clientId: renewal.clientId,

        clientName: renewal.clientName,

        renewalId: renewal.id,

        renewalReference: renewal.id,

        invoiceDate: invoiceDate.toISOString().split("T")[0],

        dueDate,

        status: "Draft",

        items: [
          {
            serviceName: renewal.service,

            description: `Renewal of ${renewal.service}`,

            sac: "",

            basicCost: renewal.amount,

            discount: 0,

            finalCost: renewal.amount,

            frequency: "Renewal",
          },
        ],

        tax: invoiceSettings.defaultGst,

        notes: invoiceSettings.notes,
      });

      setGeneratedInvoice(invoice);

      window.alert(
        `Invoice generated successfully.\n\nInvoice: ${invoice.invoiceNumber}`,
      );
    } catch (error) {
      console.error("Failed to generate renewal invoice:", error);

      window.alert("Failed to generate invoice. Please try again.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  /* =========================================================
     DATE FORMATTER
  ========================================================= */

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

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!renewal) {
    return (
      <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4 sm:space-y-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900">
              Renewal Details
            </h2>

            <p className="mt-1 break-all text-sm text-slate-500">
              Renewal ID: {renewalId}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            ← Back to Renewals
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium text-slate-700">
            Renewal record not found.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT SUMMARY
  ========================================================= */

  /*
   * paymentRefresh intentionally forces
   * this section to refresh after payment.
   */
  void paymentRefresh;

  const paymentSummary = generatedInvoice
    ? getInvoicePaymentSummary(generatedInvoice)
    : null;

  const paymentStatus = !paymentSummary
    ? "Pending"
    : paymentSummary.balance <= 0
      ? "Paid"
      : paymentSummary.totalPaid > 0
        ? "Partially Paid"
        : generatedInvoice?.dueDate &&
            new Date(generatedInvoice.dueDate) < new Date()
          ? "Overdue"
          : "Pending";

  const paymentStatusClass =
    paymentStatus === "Paid"
      ? "bg-green-50 text-green-700"
      : paymentStatus === "Partially Paid"
        ? "bg-yellow-50 text-yellow-700"
        : paymentStatus === "Overdue"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-700";

  /* =========================================================
     RENEWAL STATUS
  ========================================================= */

  const statusClass =
    renewal.status === "Upcoming"
      ? "bg-green-50 text-green-700"
      : renewal.status === "Due Soon"
        ? "bg-yellow-50 text-yellow-700"
        : renewal.status === "Overdue"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-700";

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4 sm:space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Renewal Details</h2>

          <p className="mt-1 break-all text-sm text-slate-500">
            Renewal ID: {renewal.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/renewals")}
          className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          ← Back to Renewals
        </button>
      </div>

      {/* =====================================================
          MAIN INFORMATION
      ===================================================== */}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Renewal Information */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Renewal Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Details of this client service renewal
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-6 p-4 sm:p-6 md:grid-cols-2">
            <Info label="CLIENT NAME" value={renewal.clientName} bold />

            <Info label="CLIENT ID" value={renewal.clientId} />

            <Info label="SERVICE" value={renewal.service} bold />

            <Info
              label="RENEWAL DATE"
              value={formatDate(renewal.renewalDate)}
            />

            <Info
              label="RENEWAL AMOUNT"
              value={`₹${renewal.amount.toLocaleString("en-IN")}`}
              bold
            />

            <Info label="CREATED ON" value={formatDate(renewal.createdAt)} />

            {renewal.reminderDays !== undefined && (
              <Info
                label="REMINDER"
                value={`${renewal.reminderDays} days before`}
              />
            )}

            {renewal.completedAt && (
              <Info
                label="COMPLETED ON"
                value={formatDate(renewal.completedAt)}
              />
            )}
          </div>
        </div>

        {/* Renewal Status */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Renewal Status
            </h3>
          </div>

          <div className="space-y-6 p-4 sm:space-y-7 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Status
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusClass}`}
              >
                {renewal.status}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Renewal Date
              </p>

              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatDate(renewal.renewalDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Amount
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                ₹{renewal.amount.toLocaleString("en-IN")}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Payment Status
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${paymentStatusClass}`}
              >
                {paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          GENERATED INVOICE
      ===================================================== */}

      {generatedInvoice && (
        <>
          <div className="min-w-0 overflow-hidden rounded-xl border border-green-200 bg-green-50 shadow-sm">
            <div className="border-b border-green-200 px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="text-lg font-semibold text-green-900">
                Renewal Invoice
              </h3>

              <p className="mt-1 text-sm text-green-700">
                Invoice has been generated for this renewal.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                  Invoice Number
                </p>

                <p className="mt-1 break-all text-lg font-bold text-green-900">
                  {generatedInvoice.invoiceNumber}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                  Invoice Amount
                </p>

                <p className="mt-1 text-lg font-bold text-green-900">
                  ₹{generatedInvoice.grandTotal.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${generatedInvoice.id}`)}
                  className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  View Invoice
                </button>
              </div>
            </div>
          </div>

          {/* =================================================
              PAYMENT SUMMARY
          ================================================= */}

          {paymentSummary && (
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Payment Summary
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Payment status for renewal invoice
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${paymentStatusClass}`}
                >
                  {paymentStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Invoice Amount</p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    ₹{generatedInvoice.grandTotal.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-xs text-slate-500">Received</p>

                  <p className="mt-1 text-xl font-bold text-green-700">
                    ₹{paymentSummary.totalPaid.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs text-slate-500">Outstanding</p>

                  <p className="mt-1 text-xl font-bold text-red-700">
                    ₹{paymentSummary.balance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:flex-wrap sm:px-6 sm:py-5">
                {paymentSummary.balance > 0 &&
                  generatedInvoice.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                    >
                      + Add Payment
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => navigate(`/invoices/${generatedInvoice.id}`)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  View Invoice
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Payment History
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================
          NOTES
      ===================================================== */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-lg font-semibold text-slate-900">Notes</h3>

          <p className="mt-1 text-sm text-slate-500">
            Additional information about this renewal
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="min-h-[90px] break-words rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {renewal.notes || "No notes added."}
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-lg font-semibold text-slate-900">Actions</h3>

          <p className="mt-1 text-sm text-slate-500">Manage this renewal</p>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:p-6">
          {/* Edit */}

          <button
            type="button"
            onClick={() => navigate(`/renewals/${renewal.id}/edit`)}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Edit Renewal
          </button>

          {/* Generate Invoice */}

          {!generatedInvoice && (
            <button
              type="button"
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              className={`w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white sm:w-auto ${
                generatingInvoice
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {generatingInvoice ? "Generating..." : "🧾 Generate Invoice"}
            </button>
          )}

          {/* Complete */}

          {renewal.status !== "Completed" ? (
            <button
              type="button"
              onClick={handleComplete}
              className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
            >
              ✓ Complete Renewal
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
            >
              ✓ Completed
            </button>
          )}

          {/* Archive */}

          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className={`w-full rounded-lg px-5 py-2.5 text-sm font-semibold sm:w-auto ${
              archiving
                ? "cursor-not-allowed bg-slate-300 text-slate-500"
                : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            {archiving ? "Archiving..." : "Archive Renewal"}
          </button>

          {/* Back */}

          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Back to Renewals
          </button>
        </div>
      </div>

      {/* =====================================================
          ADD PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal && generatedInvoice && (
        <AddPaymentModal
          invoice={generatedInvoice}
          onClose={() => setShowPaymentModal(false)}
          onSaved={refreshInvoice}
        />
      )}
    </div>
  );
}

/* =========================================================
   DUE DATE HELPER
========================================================= */

function getDueDate(paymentTerms: number): string {
  const days = Number(paymentTerms) || 0;

  const date = new Date();

  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
}

/* =========================================================
   INFO COMPONENT
========================================================= */

function Info({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-sm ${
          bold ? "font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}
