import { useState } from "react";

import {
  addInvoicePayment,
  getInvoicePaymentSummary,
  type Invoice,
} from "../data/invoiceStore";

/* =========================================================
   TYPES
========================================================= */

type PaymentProofData = {
  name: string;
  type: string;
  dataUrl: string;
};

type AddPaymentModalProps = {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
};

/* =========================================================
   HELPERS
========================================================= */

function currency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   IMAGE COMPRESSION
========================================================= */

function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);

          width = maxWidth;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to process image."));

          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", quality);

        resolve(compressed);
      };

      image.onerror = () => {
        reject(new Error("Unable to read image."));
      };

      image.src = String(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read file."));
    };

    reader.readAsDataURL(file);
  });
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AddPaymentModal({
  invoice,
  onClose,
  onSaved,
}: AddPaymentModalProps) {
  const paymentSummary = getInvoicePaymentSummary(invoice);

  const today = new Date().toISOString().split("T")[0];

  const [paymentDate, setPaymentDate] = useState(today);

  const [amountPaid, setAmountPaid] = useState(
    paymentSummary.balance.toString(),
  );

  const [paymentMode, setPaymentMode] = useState("Bank Transfer");

  const [transactionNumber, setTransactionNumber] = useState("");

  const [notes, setNotes] = useState("");

  const [paymentProof, setPaymentProof] = useState<PaymentProofData | null>(
    null,
  );

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const [uploadingProof, setUploadingProof] = useState(false);

  /* =======================================================
     PAYMENT PROOF
  ======================================================= */

  async function handleProofChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");

      event.target.value = "";

      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Payment proof image must be less than 10 MB.");

      event.target.value = "";

      return;
    }

    try {
      setUploadingProof(true);

      const dataUrl = await compressImage(file);

      setPaymentProof({
        name: file.name,
        type: file.type,
        dataUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to process payment proof.",
      );
    } finally {
      setUploadingProof(false);

      event.target.value = "";
    }
  }

  /* =======================================================
     REMOVE PROOF
  ======================================================= */

  function removeProof() {
    setPaymentProof(null);
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const amount = Number(amountPaid);

    if (!amount || amount <= 0) {
      setError("Please enter a valid payment amount.");

      return;
    }

    if (amount > paymentSummary.balance) {
      setError(
        `Payment cannot be greater than outstanding balance of ${currency(
          paymentSummary.balance,
        )}.`,
      );

      return;
    }

    if (!paymentDate) {
      setError("Please select payment date.");

      return;
    }

    if (!paymentMode) {
      setError("Please select payment mode.");

      return;
    }

    try {
      setSaving(true);

      /*
       * paymentProof is stored with the
       * payment through invoiceStore.
       */

      addInvoicePayment(invoice.id, {
        paymentDate,
        amountPaid: amount,
        paymentMode,
        transactionNumber: transactionNumber.trim(),
        notes: notes.trim(),
        paymentProof,
      } as any);

      onSaved();

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save payment. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Payment</h2>

            <p className="mt-1 text-sm text-gray-500">
              {invoice.invoiceNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* =================================================
              BODY
          ================================================= */}

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            {/* =================================================
                PAYMENT SUMMARY
            ================================================= */}

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Invoice Total</p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {currency(invoice.grandTotal)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Already Paid</p>

                  <p className="mt-1 font-semibold text-green-600">
                    {currency(paymentSummary.totalPaid)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>

                  <p className="mt-1 font-semibold text-red-600">
                    {currency(paymentSummary.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                PAYMENT DATE
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                AMOUNT
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount Paid <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={paymentSummary.balance}
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  placeholder="0.00"
                />
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Maximum payable: {currency(paymentSummary.balance)}
              </p>
            </div>

            {/* =================================================
                PAYMENT MODE
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Mode <span className="text-red-500">*</span>
              </label>

              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="Bank Transfer">Bank Transfer</option>

                <option value="UPI">UPI</option>

                <option value="Cash">Cash</option>

                <option value="Cheque">Cheque</option>

                <option value="Card">Card</option>

                <option value="Other">Other</option>
              </select>
            </div>

            {/* =================================================
                TRANSACTION NUMBER
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Transaction / Reference No.
              </label>

              <input
                type="text"
                value={transactionNumber}
                onChange={(event) => setTransactionNumber(event.target.value)}
                placeholder="UTR / Cheque No. / Reference No."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                PAYMENT PROOF
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Proof
              </label>

              {!paymentProof ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-6 transition hover:border-green-400 hover:bg-green-50">
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-xl">
                      📎
                    </div>

                    <span className="text-sm font-semibold text-gray-700">
                      {uploadingProof
                        ? "Processing..."
                        : "Upload Payment Proof"}
                    </span>

                    <span className="mt-1 text-xs text-gray-500">
                      JPG, PNG or WEBP • Max 10 MB
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProofChange}
                      disabled={uploadingProof}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={paymentProof.dataUrl}
                      alt="Payment proof preview"
                      className="h-20 w-20 rounded-lg border border-gray-200 bg-white object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {paymentProof.name}
                      </p>

                      <p className="mt-1 text-xs text-green-700">
                        Payment proof attached
                      </p>

                      <div className="mt-2 flex gap-2">
                        <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Replace
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProofChange}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={removeProof}
                          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-1.5 text-xs text-gray-500">
                Upload a screenshot of UPI / bank transfer / payment
                confirmation.
              </p>
            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional payment notes..."
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || uploadingProof || paymentSummary.balance <= 0}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
