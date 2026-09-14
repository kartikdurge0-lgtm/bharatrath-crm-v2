import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  calculateInvoiceTotals,
  getInvoice,
  getInvoicePaymentSummary,
  updateInvoice,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
} from "../data/invoiceStore";

import { getServices } from "../data/serviceStore";
import { getActiveClientsFromSupabase } from "../data/clientStore";

/* =========================================================
   CLIENT
========================================================= */

/* =========================================================
   MAIN
========================================================= */

export default function EditInvoice() {
  const navigate = useNavigate();

  const { invoiceId } = useParams<{
    invoiceId: string;
  }>();

  const [clients, setClients] = useState<
    Awaited<ReturnType<typeof getActiveClientsFromSupabase>>
  >([]);

  const [loadedInvoice, setLoadedInvoice] = useState<
    Invoice | null | undefined
  >(undefined);

  const [loadingInvoice, setLoadingInvoice] = useState(true);

  useEffect(() => {
    let mounted = true;

    setLoadingInvoice(true);

    void Promise.all([
      getActiveClientsFromSupabase(),
      invoiceId ? getInvoice(invoiceId) : Promise.resolve(undefined),
    ])
      .then(([clientData, invoiceData]) => {
        if (!mounted) return;
        setClients(clientData);
        setLoadedInvoice(invoiceData ?? null);
      })
      .catch((error) => {
        console.error("Failed to load invoice:", error);
        if (mounted) {
          setClients([]);
          setLoadedInvoice(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingInvoice(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  const [services, setServices] = useState<
    Awaited<ReturnType<typeof getServices>>
  >([]);

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      try {
        const loadedServices = await getServices();

        if (mounted) {
          setServices(loadedServices);
        }
      } catch (error) {
        console.error("Failed to load services:", error);
      }
    };

    void loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  const invoice = loadedInvoice;

  /* =======================================================
     STATE
  ======================================================= */

  const [clientId, setClientId] = useState("");

  const [invoiceDate, setInvoiceDate] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [status, setStatus] = useState<InvoiceStatus>("Draft");

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [tax, setTax] = useState(18);

  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");

  /*
   * The invoice is loaded asynchronously from Supabase.
   * Form state must therefore be populated AFTER the invoice
   * arrives. Initializing useState from invoice?.field would
   * leave the form empty because the first render happens
   * before the async request completes.
   */
  useEffect(() => {
    if (!invoice) return;

    setClientId(invoice.clientId || "");
    setInvoiceDate(invoice.invoiceDate || "");
    setDueDate(invoice.dueDate || "");
    setStatus(invoice.status || "Draft");
    setItems(invoice.items || []);
    setTax(Number(invoice.tax) || 18);
    setNotes(invoice.notes || "");
  }, [invoice]);

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (loadingInvoice) {
    return (
      <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-5 pb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Invoice</h2>

          <p className="mt-1 text-sm text-gray-500">
            Loading invoice details...
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-10 w-full animate-pulse rounded bg-gray-100" />
          <div className="mt-4 h-10 w-full animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-5 pb-8">
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
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  /* =======================================================
     PAYMENT SUMMARY
  ======================================================= */

  const paymentSummary = getInvoicePaymentSummary(invoice);

  /*
   * Payment-controlled statuses must not be manually changed.
   *
   * Draft / Sent:
   *   Editable from this page.
   *
   * Partially Paid / Paid / Overdue:
   *   Controlled by payment / due-date logic.
   *
   * Cancelled:
   *   Locked.
   */

  const isPaymentControlled =
    paymentSummary.totalPaid > 0 ||
    invoice.status === "Partially Paid" ||
    invoice.status === "Paid" ||
    invoice.status === "Overdue";

  const isCancelled = invoice.status === "Cancelled";

  const isStatusLocked = isPaymentControlled || isCancelled;

  /* =======================================================
     TOTALS
  ======================================================= */

  const totals = calculateInvoiceTotals(items, tax);

  /* =======================================================
     CLIENT NAME
  ======================================================= */

  const selectedClient = clients.find(
    (client) => String(client.id) === String(clientId),
  );

  const clientName = selectedClient?.company || invoice.clientName || "";

  /* =======================================================
     SERVICE
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
          return {
            ...item,

            serviceId: "",

            serviceName: "",

            description: "",

            sac: "",

            basicCost: 0,

            discount: 0,

            finalCost: 0,

            frequency: "",
          };
        }

        const serviceName = service.serviceName || service.service_name || "";

        const sac = service.sacCode || service.sac_code || "";

        const basicCost =
          Number(service.defaultPrice ?? service.default_price ?? 0) || 0;

        const frequency = service.billingType || service.billing_type || "";

        return {
          ...item,

          serviceId: String(service.id),

          serviceName,

          description: item.description || service.description || serviceName,

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
     BASIC COST
  ======================================================= */

  function handleBasicCost(index: number, value: string) {
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

  function handleDiscount(index: number, value: string) {
    const discount = Math.max(0, Number(value) || 0);

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const actual = Math.min(discount, Number(item.basicCost) || 0);

        return {
          ...item,

          discount: actual,

          finalCost: Number(item.basicCost) - actual,
        };
      }),
    );
  }

  /* =======================================================
     ADD ITEM
  ======================================================= */

  function addItem() {
    const newItem: InvoiceItem = {
      id: `ITEM-${Date.now()}`,

      serviceId: "",

      serviceName: "",

      description: "",

      sac: "",

      basicCost: 0,

      discount: 0,

      finalCost: 0,

      frequency: "",
    };

    setItems((current) => [...current, newItem]);
  }

  /* =======================================================
     REMOVE
  ======================================================= */

  function removeItem(index: number) {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  /* =======================================================
     CURRENCY
  ======================================================= */

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!invoice) {
      setError("Invoice not found.");
      return;
    }

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

    /*
     * Never overwrite a payment-controlled status.
     * The invoice status remains whatever the payment
     * system currently says.
     */

    const finalStatus: InvoiceStatus = isStatusLocked ? invoice.status : status;

    await updateInvoice(invoice.id, {
      clientId: String(clientId),

      clientName,

      invoiceDate,

      dueDate,

      status: finalStatus,

      items: validItems,

      tax,

      subtotal: totals.subtotal,

      taxAmount: totals.taxAmount,

      grandTotal: totals.grandTotal,

      amount: totals.subtotal,

      notes,

      updatedAt: new Date().toISOString(),
    });

    navigate(`/invoices/${invoice.id}`);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-6 pb-8">
      {/* HEADER */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="break-words text-2xl font-bold text-gray-900">
            Edit Invoice
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Invoice No: {invoice.invoiceNumber}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================
            INFORMATION
        ================================================= */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h3 className="font-semibold text-gray-900">Invoice Information</h3>

            <p className="mt-1 text-sm text-gray-500">
              Update invoice details.
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
              >
                <option value="">Select Client</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.id}
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
                value={invoice.invoiceNumber}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600"
              />
            </div>

            {/* QUOTATION */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quotation
              </label>

              <input
                value={invoice.quotationNumber || "No Quotation"}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600"
              />
            </div>

            {/* DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
              />
            </div>

            {/* DUE DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                min={invoiceDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
              />
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                disabled={isStatusLocked}
                onChange={(event) =>
                  setStatus(event.target.value as InvoiceStatus)
                }
                className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm ${
                  isStatusLocked
                    ? "cursor-not-allowed bg-gray-50 text-gray-500"
                    : ""
                }`}
              >
                {isStatusLocked ? (
                  <option value={invoice.status}>{invoice.status}</option>
                ) : (
                  <>
                    <option value="Draft">Draft</option>

                    <option value="Sent">Sent</option>
                  </>
                )}
              </select>

              <p className="mt-1 text-xs text-gray-400">
                {isCancelled
                  ? "Cancelled invoices cannot have their status changed."
                  : isPaymentControlled
                    ? "Payment-related status is controlled automatically by payment records."
                    : "Use Draft or Sent. Payment status updates automatically when payments are recorded."}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            PAYMENT SUMMARY
        ================================================= */}

        {paymentSummary.totalPaid > 0 && (
          <div className="min-w-0 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Invoice Total</p>

                <p className="mt-1 text-sm font-bold text-gray-900">
                  {currency(invoice.grandTotal)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Paid</p>

                <p className="mt-1 text-sm font-bold text-green-700">
                  {currency(paymentSummary.totalPaid)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Balance</p>

                <p className="mt-1 text-sm font-bold text-amber-700">
                  {currency(paymentSummary.balance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            ITEMS
        ================================================= */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h3 className="font-semibold text-gray-900">
                Service / Product Details
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Update invoice services.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="bg-green-600 text-xs font-semibold uppercase text-white">
                  <th className="px-3 py-3">S.No.</th>

                  <th className="px-3 py-3 text-left">Service / Description</th>

                  <th className="px-3 py-3">SAC</th>

                  <th className="px-3 py-3">Basic Cost</th>

                  <th className="px-3 py-3">Discount</th>

                  <th className="px-3 py-3">Final Cost</th>

                  <th className="px-3 py-3">Frequency</th>

                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-4 text-center text-sm">
                      {index + 1}
                    </td>

                    <td className="px-3 py-4">
                      <select
                        value={
                          services.find(
                            (service) =>
                              String(service.id) === String(item.serviceId),
                          )?.id ||
                          services.find(
                            (service) =>
                              service.status !== "Inactive" &&
                              (
                                service.serviceName ||
                                service.service_name ||
                                ""
                              )
                                .trim()
                                .toLowerCase() ===
                                String(item.serviceName || "")
                                  .trim()
                                  .toLowerCase(),
                          )?.id ||
                          ""
                        }
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
                              {service.serviceName || service.service_name}
                            </option>
                          ))}
                      </select>

                      <input
                        value={item.description || ""}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((currentItem, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...currentItem,
                                    description: event.target.value,
                                  }
                                : currentItem,
                            ),
                          )
                        }
                        placeholder="Description"
                        className="mt-2 w-full min-w-[250px] rounded-lg border border-gray-200 px-3 py-2 text-xs"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        value={item.sac}
                        readOnly
                        className="w-[110px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.basicCost}
                        onChange={(event) =>
                          handleBasicCost(index, event.target.value)
                        }
                        className="w-[125px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(event) =>
                          handleDiscount(index, event.target.value)
                        }
                        className="w-[120px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        value={item.finalCost}
                        readOnly
                        className="w-[125px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-right text-sm font-semibold"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        value={item.frequency}
                        readOnly
                        className="w-[110px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                      />
                    </td>

                    <td className="px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
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

          {/* TOTAL */}

          <div className="border-t border-gray-100 px-6 py-6">
            <div className="ml-auto max-w-[420px]">
              <div className="flex justify-between border-b py-3 text-sm">
                <span>Sub Total</span>

                <strong>{currency(totals.subtotal)}</strong>
              </div>

              <div className="flex justify-between border-b py-3 text-sm">
                <span>GST ({tax}%)</span>

                <strong>{currency(totals.taxAmount)}</strong>
              </div>

              <div className="flex justify-between py-4">
                <strong className="text-base">Amount Payable incl. GST</strong>

                <strong className="text-xl text-green-600">
                  {currency(totals.grandTotal)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            NOTES
        ================================================= */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
          />
        </div>

        {/* ACTION */}

        <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
