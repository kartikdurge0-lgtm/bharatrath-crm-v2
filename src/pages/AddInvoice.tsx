import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  createInvoice,
  calculateInvoiceTotals,
  type InvoiceItem,
  type InvoiceStatus,
} from "../data/invoiceStore";

import {
  getInvoiceSettings,
  updateNextInvoiceNumber,
} from "../data/settingsStore";

import { getClients } from "../data/clientStore";

import { getServices } from "../data/serviceStore";

import { getQuotation, type Quotation } from "../data/quotationStore";

/* =========================================================
   HELPERS
========================================================= */

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyItem(): InvoiceItem {
  return {
    id: "",
    serviceId: undefined,
    serviceName: "",
    description: "",
    sac: "",
    basicCost: 0,
    discount: 0,
    finalCost: 0,
    frequency: "",
  };
}

function currency(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AddInvoice() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const quotationId = searchParams.get("quotationId") || "";

  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const clients = useMemo(() => getClients(), []);

  const services = useMemo(() => getServices(), []);

  const quotation = useMemo<Quotation | null>(() => {
    if (!quotationId) {
      return null;
    }

    return getQuotation(quotationId);
  }, [quotationId]);

  /* -------------------------------------------------------
     SETTINGS
  ------------------------------------------------------- */

  const invoiceSettings = useMemo(() => getInvoiceSettings(), []);

  const settingsPrefix = invoiceSettings.prefix.trim() || "INV-";

  const settingsSerial = Math.max(1, Number(invoiceSettings.nextNumber) || 1);

  const defaultInvoiceNumber = `${settingsPrefix}${String(settingsSerial).padStart(3, "0")}`;

  /* -------------------------------------------------------
     QUOTATION PREFILL
  ------------------------------------------------------- */

  const quotationClientId = quotation?.clientId || "";

  const quotationItems: InvoiceItem[] =
    quotation?.items?.map((item, index) => ({
      id: `ITEM-${Date.now()}-${index}`,

      serviceId: item.serviceId ? String(item.serviceId) : undefined,

      serviceName: item.description || "",

      description: item.description || "",

      sac: item.sac || "",

      basicCost: Number(item.basicCost) || 0,

      discount: Number(item.discountedCost) || 0,

      finalCost: Number(item.finalCost) || 0,

      frequency: item.frequency || "",
    })) || [];

  /* -------------------------------------------------------
     FORM STATE
  ------------------------------------------------------- */

  const [clientId, setClientId] = useState<string>(quotationClientId);

  /*
   * Invoice number is captured when the form opens.
   * The final number is checked again during submit
   * to avoid using stale Settings data.
   */

  const [invoiceNumber] = useState<string>(defaultInvoiceNumber);

  const [invoiceDate, setInvoiceDate] = useState<string>(today());

  const [dueDate, setDueDate] = useState<string>("");

  const [status, setStatus] = useState<InvoiceStatus>("Draft");

  const [items, setItems] = useState<InvoiceItem[]>(
    quotationItems.length > 0 ? quotationItems : [emptyItem()],
  );

  const [tax, setTax] = useState<number>(
    quotation
      ? Number(quotation.tax) || 18
      : Number(invoiceSettings.defaultGst) || 18,
  );

  const [notes, setNotes] = useState<string>(invoiceSettings.notes || "");

  const [error, setError] = useState<string>("");

  /* -------------------------------------------------------
     CLIENT
  ------------------------------------------------------- */

  const selectedClient = clients.find(
    (client) => String(client.id) === String(clientId),
  );

  const clientName = selectedClient?.company || "";

  /* -------------------------------------------------------
     TOTALS
  ------------------------------------------------------- */

  const totals = calculateInvoiceTotals(items, tax);

  /* =======================================================
     SERVICE CHANGE
  ======================================================= */

  function handleServiceChange(index: number, serviceId: string) {
    const service = services.find(
      (item) => String(item.id) === String(serviceId),
    );

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (!service) {
          return emptyItem();
        }

        const serviceName = service.service_name || service.serviceName || "";

        const description = service.description || serviceName;

        const sac = service.sac_code || service.sacCode || "";

        const basicCost =
          Number(service.default_price ?? service.defaultPrice ?? 0) || 0;

        const frequency = service.billing_type || service.billingType || "";

        return {
          ...item,

          id: item.id || `ITEM-${Date.now()}-${index}`,

          serviceId: String(service.id),

          serviceName,

          description,

          sac,

          basicCost,

          discount: 0,

          finalCost: basicCost,

          frequency,
        };
      }),
    );
  }

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  function handleDescriptionChange(index: number, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              description: value,
            }
          : item,
      ),
    );
  }

  /* =======================================================
     BASIC COST
  ======================================================= */

  function handleBasicCostChange(index: number, value: string) {
    const basicCost = Math.max(0, Number(value) || 0);

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const discount = Math.min(Number(item.discount) || 0, basicCost);

        return {
          ...item,

          basicCost,

          discount,

          finalCost: basicCost - discount,
        };
      }),
    );
  }

  /* =======================================================
     DISCOUNT
  ======================================================= */

  function handleDiscountChange(index: number, value: string) {
    const discount = Math.max(0, Number(value) || 0);

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const basicCost = Number(item.basicCost) || 0;

        const actualDiscount = Math.min(discount, basicCost);

        return {
          ...item,

          discount: actualDiscount,

          finalCost: basicCost - actualDiscount,
        };
      }),
    );
  }

  /* =======================================================
     FREQUENCY
  ======================================================= */

  function handleFrequencyChange(index: number, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              frequency: value,
            }
          : item,
      ),
    );
  }

  /* =======================================================
     ADD ITEM
  ======================================================= */

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  /* =======================================================
     DELETE ITEM
  ======================================================= */

  function deleteItem(index: number) {
    if (items.length === 1) {
      setItems([emptyItem()]);

      return;
    }

    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!clientId) {
      setError("Please select a client.");

      return;
    }

    if (!invoiceDate) {
      setError("Please select invoice date.");

      return;
    }

    if (dueDate && dueDate < invoiceDate) {
      setError("Due date cannot be before invoice date.");

      return;
    }

    const validItems = items.filter(
      (item) => item.serviceId && item.serviceName,
    );

    if (validItems.length === 0) {
      setError("Please add at least one service.");

      return;
    }

    /* -----------------------------------------------------
       LATEST SETTINGS
    ----------------------------------------------------- */

    const latestSettings = getInvoiceSettings();

    const latestPrefix = latestSettings.prefix.trim() || "INV-";

    const latestSerial = Math.max(1, Number(latestSettings.nextNumber) || 1);

    /*
     * Always generate the final invoice number
     * from the latest Settings value.
     */

    const finalInvoiceNumber = `${latestPrefix}${String(latestSerial).padStart(
      3,
      "0",
    )}`;

    /* -----------------------------------------------------
       PREPARE ITEMS
    ----------------------------------------------------- */

    const preparedItems = validItems.map((item, index) => ({
      ...item,

      id: item.id || `ITEM-${Date.now()}-${index}`,

      serviceId: item.serviceId ? String(item.serviceId) : undefined,

      serviceName: item.serviceName || item.description || "",

      description: item.description || item.serviceName || "",

      sac: item.sac || "",

      basicCost: Number(item.basicCost) || 0,

      discount: Number(item.discount) || 0,

      finalCost: Number(item.finalCost) || 0,

      frequency: item.frequency || "",
    }));

    /* -----------------------------------------------------
       CREATE INVOICE
    ----------------------------------------------------- */

    const invoice = createInvoice({
      invoiceNumber: finalInvoiceNumber,

      clientId: String(clientId),

      clientName,

      clientContactPerson: selectedClient?.contactPerson,

      clientAddress: selectedClient?.address,

      clientGstNumber: selectedClient?.gst,

      clientEmail: selectedClient?.email,

      clientPhone: selectedClient?.phone,

      quotationId: quotation?.id,

      quotationNumber: quotation?.quotationNumber,

      invoiceDate,

      dueDate: dueDate || undefined,

      status,

      items: preparedItems,

      tax,

      notes,
    });

    /* -----------------------------------------------------
       UPDATE NEXT NUMBER
    ----------------------------------------------------- */

    /*
     * Increment only after successful invoice
     * creation.
     */

    updateNextInvoiceNumber(latestSerial + 1);

    /* -----------------------------------------------------
       NAVIGATE
    ----------------------------------------------------- */

    navigate(`/invoices/${invoice.id}`);
  }

  /* =======================================================
     QUOTATION NOT FOUND
  ======================================================= */

  if (quotationId && !quotation) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>

          <p className="mt-1 text-sm text-gray-500">
            Quotation could not be found.
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            The requested quotation does not exist or may have been deleted.
          </p>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="mt-4 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {quotation ? "Create Invoice from Quotation" : "Add Invoice"}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {quotation
              ? `Convert ${quotation.quotationNumber} into an invoice`
              : "Create a new client invoice"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(quotation ? `/quotations/${quotation.id}` : "/invoices")
          }
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      {/* =================================================
          QUOTATION BANNER
      ================================================= */}

      {quotation && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                From Quotation
              </p>

              <p className="mt-1 text-base font-bold text-gray-900">
                {quotation.quotationNumber}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {quotation.clientName}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500">Quotation Total</p>

              <p className="mt-1 text-lg font-bold text-green-700">
                {currency(quotation.grandTotal)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================
            INVOICE INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">Invoice Information</h2>

            <p className="mt-1 text-sm text-gray-500">
              Verify the invoice details before saving.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            {/* CLIENT */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Client <span className="text-red-500">*</span>
              </label>

              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select Client</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company}
                    {" — "}
                    {client.contactPerson}
                  </option>
                ))}
              </select>
            </div>

            {/* INVOICE NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Number
              </label>

              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700"
              />

              <p className="mt-1 text-xs text-gray-400">
                Generated from Settings → Invoice Settings.
              </p>
            </div>

            {/* INVOICE DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* DUE DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Due Date
              </label>

              <input
                type="date"
                min={invoiceDate}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as InvoiceStatus)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm"
              >
                <option value="Draft">Draft</option>

                <option value="Sent">Sent</option>

                <option value="Partially Paid">Partially Paid</option>

                <option value="Paid">Paid</option>

                <option value="Overdue">Overdue</option>

                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </section>

        {/* =================================================
            QUOTATION REFERENCE
        ================================================= */}

        {quotation && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">Quotation Reference</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Quotation No.</p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {quotation.quotationNumber}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Quotation Date</p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {quotation.quotationDate}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Quotation Status</p>

                <p className="mt-1 text-sm font-semibold text-green-700">
                  {quotation.status}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            SERVICES
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="font-semibold text-gray-900">Services</h2>

              <p className="mt-1 text-sm text-gray-500">
                {quotation
                  ? "Services copied from the quotation. You can edit them if required."
                  : "Select services from Service Master."}
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              + Add Service
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="bg-green-600 text-xs font-semibold uppercase text-white">
                  <th className="w-12 px-3 py-3">#</th>

                  <th className="px-3 py-3 text-left">Service / Description</th>

                  <th className="w-28 px-3 py-3">SAC</th>

                  <th className="w-32 px-3 py-3">Basic Cost</th>

                  <th className="w-32 px-3 py-3">Discount</th>

                  <th className="w-32 px-3 py-3">Final Cost</th>

                  <th className="w-32 px-3 py-3">Frequency</th>

                  <th className="w-24 px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id || `row-${index}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-3 py-4 text-center text-sm">
                      {index + 1}
                    </td>

                    {/* SERVICE */}

                    <td className="px-3 py-4">
                      <select
                        value={item.serviceId ? String(item.serviceId) : ""}
                        onChange={(event) =>
                          handleServiceChange(index, event.target.value)
                        }
                        className="w-full min-w-[250px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Select Service</option>

                        {services
                          .filter((service) => service.status !== "Inactive")
                          .map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.service_name ||
                                service.serviceName ||
                                "Unnamed Service"}
                            </option>
                          ))}
                      </select>

                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(event) =>
                          handleDescriptionChange(index, event.target.value)
                        }
                        placeholder="Description"
                        className="mt-2 w-full min-w-[250px] rounded-lg border border-gray-200 px-3 py-2 text-xs"
                      />
                    </td>

                    {/* SAC */}

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.sac || ""}
                        readOnly
                        className="w-[110px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    </td>

                    {/* BASIC COST */}

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.basicCost}
                        onChange={(event) =>
                          handleBasicCostChange(index, event.target.value)
                        }
                        className="w-[125px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                      />
                    </td>

                    {/* DISCOUNT */}

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(event) =>
                          handleDiscountChange(index, event.target.value)
                        }
                        className="w-[125px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                      />
                    </td>

                    {/* FINAL */}

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.finalCost}
                        readOnly
                        className="w-[125px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-right text-sm font-semibold"
                      />
                    </td>

                    {/* FREQUENCY */}

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.frequency || ""}
                        onChange={(event) =>
                          handleFrequencyChange(index, event.target.value)
                        }
                        className="w-[110px] rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </td>

                    {/* DELETE */}

                    <td className="px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => deleteItem(index)}
                        className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="border-t border-gray-100 p-6">
            <div className="ml-auto w-full max-w-[420px]">
              <div className="flex justify-between border-b py-3 text-sm">
                <span className="text-gray-600">Sub Total</span>

                <span className="font-semibold">
                  {currency(totals.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b py-3 text-sm">
                <span className="text-gray-600">GST</span>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tax}
                    onChange={(event) =>
                      setTax(
                        Math.min(
                          100,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      )
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-right text-sm"
                  />

                  <span className="font-semibold">
                    {currency(totals.taxAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="font-bold text-gray-900">Grand Total</span>

                <span className="text-xl font-bold text-green-600">
                  {currency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            NOTES
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder="Enter invoice notes..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100"
          />
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex justify-end gap-3 pb-10">
          <button
            type="button"
            onClick={() =>
              navigate(quotation ? `/quotations/${quotation.id}` : "/invoices")
            }
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            ✓ Create Invoice
          </button>
        </div>
      </form>
    </div>
  );
}
