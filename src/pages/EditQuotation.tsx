import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getQuotation, updateQuotation } from "../data/quotationStore";

import { getServices } from "../data/serviceStore";
import { getClients } from "../data/clientStore";

type AnyRecord = Record<string, any>;

const emptyItem = (): AnyRecord => ({
  serviceId: "",
  serviceName: "",
  sac: "",
  basicCost: 0,
  discount: 0,
  finalCost: 0,
  frequency: "",
});

export default function EditQuotation() {
  const navigate = useNavigate();
  const { quotationId } = useParams();

  const [quotation, setQuotation] = useState<AnyRecord | null>(null);

  const [clients, setClients] = useState<AnyRecord[]>([]);
  const [services, setServices] = useState<AnyRecord[]>([]);

  const [clientId, setClientId] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("Draft");

  const [items, setItems] = useState<AnyRecord[]>([emptyItem()]);

  const [gst, setGst] = useState(18);

  const [scopeOfWork, setScopeOfWork] = useState("");
  const [implementationProcess, setImplementationProcess] = useState("");
  const [supportTraining, setSupportTraining] = useState("");
  const [remarks, setRemarks] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  const [error, setError] = useState("");

  /* =====================================================
     LOAD QUOTATION
  ===================================================== */

  useEffect(() => {
    if (!quotationId) return;

    const data = getQuotation(quotationId) as AnyRecord | null;

    if (!data) {
      setQuotation(null);
      return;
    }

    setQuotation(data);

    setClientId(data.clientId || "");
    setQuotationNumber(data.quotationNumber || "");
    setQuotationDate(data.quotationDate || "");
    setValidUntil(data.validUntil || "");
    setStatus(data.status || "Draft");

    setItems(
      Array.isArray(data.items) && data.items.length
        ? data.items
        : [emptyItem()],
    );

    setGst(Number(data.gst ?? data.gstRate ?? data.tax ?? 18));

    setScopeOfWork(data.scopeOfWork || "");
    setImplementationProcess(data.implementationProcess || "");
    setSupportTraining(data.supportTraining || "");
    setRemarks(data.remarks || "");
    setTermsConditions(data.termsConditions || "");
  }, [quotationId]);

  /* =====================================================
     LOAD CLIENTS / SERVICES
  ===================================================== */

  useEffect(() => {
    setClients((getClients() || []) as AnyRecord[]);

    setServices((getServices() || []) as AnyRecord[]);
  }, []);

  /* =====================================================
     CLIENT NAME
  ===================================================== */

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === clientId);
  }, [clients, clientId]);

  const clientName =
    selectedClient?.companyName ||
    selectedClient?.clientName ||
    selectedClient?.name ||
    quotation?.clientName ||
    "";

  /* =====================================================
     SERVICE HELPERS
  ===================================================== */

  function getServiceName(service: AnyRecord) {
    return service.name || service.serviceName || "";
  }

  function getServicePrice(service: AnyRecord) {
    return Number(service.defaultPrice ?? service.price ?? 0);
  }

  function getServiceSac(service: AnyRecord) {
    return service.sacCode || service.sac || "";
  }

  function getServiceFrequency(service: AnyRecord) {
    return service.billingType || service.frequency || "";
  }

  /* =====================================================
     ADD ITEM
  ===================================================== */

  function addServiceRow() {
    setItems((current) => [...current, emptyItem()]);
  }

  /* =====================================================
     DELETE ITEM
  ===================================================== */

  function deleteServiceRow(index: number) {
    setItems((current) => {
      if (current.length === 1) {
        return [emptyItem()];
      }

      return current.filter((_, i) => i !== index);
    });
  }

  /* =====================================================
     SERVICE SELECT
  ===================================================== */

  function handleServiceChange(index: number, serviceId: string) {
    const service = services.find((item) => item.id === serviceId);

    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        if (!service) {
          return {
            ...item,
            serviceId,
          };
        }

        const basicCost = getServicePrice(service);

        return {
          ...item,

          serviceId: service.id,

          serviceName: getServiceName(service),

          sac: getServiceSac(service),

          basicCost,

          discount: 0,

          finalCost: basicCost,

          frequency: getServiceFrequency(service),
        };
      }),
    );
  }

  /* =====================================================
     ITEM UPDATE
  ===================================================== */

  function updateItem(index: number, field: string, value: any) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        const updated = {
          ...item,
          [field]: value,
        };

        if (field === "basicCost" || field === "discount") {
          const basic = Number(updated.basicCost || 0);

          const discount = Number(updated.discount || 0);

          updated.finalCost = Math.max(0, basic - discount);
        }

        return updated;
      }),
    );
  }

  /* =====================================================
     TOTALS
  ===================================================== */

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.finalCost || 0), 0);
  }, [items]);

  const gstAmount = useMemo(() => {
    return (subtotal * Number(gst || 0)) / 100;
  }, [subtotal, gst]);

  const grandTotal = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  /* =====================================================
     CURRENCY
  ===================================================== */

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /* =====================================================
     SAVE
  ===================================================== */

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!quotationId) {
      setError("Quotation ID is missing.");
      return;
    }

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    const validItems = items.filter((item) => item.serviceId);

    if (validItems.length === 0) {
      setError("Please add at least one service.");
      return;
    }

    const updated = {
      ...quotation,

      clientId,
      clientName,

      quotationNumber,
      quotationDate,
      validUntil,

      status,

      items: validItems,

      subtotal,

      gst,

      gstAmount,

      total: grandTotal,

      grandTotal,

      scopeOfWork,

      implementationProcess,

      supportTraining,

      remarks,

      termsConditions,

      updatedAt: new Date().toISOString(),
    };

    updateQuotation(quotationId, updated as any);

    navigate(`/quotations/${quotationId}`);
  }

  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!quotation) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Quotation</h1>

          <p className="mt-1 text-sm text-gray-500">Update quotation details</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Quotation Not Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            The quotation could not be found.
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

  /* =====================================================
     UI
  ===================================================== */

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Quotation</h1>

          <p className="mt-1 text-sm text-gray-500">Update quotation details</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/quotations/${quotation.id}`)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Quotation
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =================================================
          QUOTATION INFORMATION
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="font-semibold text-gray-900">Quotation Information</h2>

          <p className="mt-1 text-sm text-gray-500">
            Update the basic quotation details.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* CLIENT */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Client <span className="text-red-500">*</span>
            </label>

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none"
            >
              <option value="">Select Client</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName ||
                    client.clientName ||
                    client.name ||
                    client.id}{" "}
                  ({client.id})
                </option>
              ))}
            </select>
          </div>

          {/* QUOTATION NUMBER */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Quotation Number
            </label>

            <input
              type="text"
              value={quotationNumber}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600"
            />
          </div>

          {/* DATE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Quotation Date <span className="text-red-500">*</span>
            </label>

            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* VALID UNTIL */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Valid Until
            </label>

            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* STATUS */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Status
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="Draft">Draft</option>

              <option value="Sent">Sent</option>

              <option value="Accepted">Accepted</option>

              <option value="Rejected">Rejected</option>

              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* =================================================
          SERVICES
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="font-semibold text-gray-900">Services</h2>

            <p className="mt-1 text-sm text-gray-500">
              Select services from Service Master.
            </p>
          </div>

          <button
            type="button"
            onClick={addServiceRow}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            + Add Service
          </button>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="min-w-[1100px] w-full">
            <thead>
              <tr className="bg-green-600">
                <th className="px-3 py-3 text-center text-xs font-semibold text-white">
                  #
                </th>

                <th className="px-3 py-3 text-left text-xs font-semibold text-white">
                  Service
                </th>

                <th className="px-3 py-3 text-left text-xs font-semibold text-white">
                  SAC
                </th>

                <th className="px-3 py-3 text-right text-xs font-semibold text-white">
                  Basic Cost
                </th>

                <th className="px-3 py-3 text-right text-xs font-semibold text-white">
                  Discount
                </th>

                <th className="px-3 py-3 text-right text-xs font-semibold text-white">
                  Final Cost
                </th>

                <th className="px-3 py-3 text-left text-xs font-semibold text-white">
                  Frequency
                </th>

                <th className="px-3 py-3 text-center text-xs font-semibold text-white">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-4 text-center text-sm">{index + 1}</td>

                  {/* SERVICE */}

                  <td className="px-3 py-4">
                    <select
                      value={item.serviceId || ""}
                      onChange={(e) =>
                        handleServiceChange(index, e.target.value)
                      }
                      className="w-[210px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Select Service</option>

                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {getServiceName(service)}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* SAC */}

                  <td className="px-3 py-4">
                    <input
                      type="text"
                      value={item.sac || item.sacCode || ""}
                      readOnly
                      className="w-[100px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                    />
                  </td>

                  {/* BASIC */}

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="0"
                      value={item.basicCost || 0}
                      onChange={(e) =>
                        updateItem(index, "basicCost", Number(e.target.value))
                      }
                      className="w-[130px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                    />
                  </td>

                  {/* DISCOUNT */}

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      min="0"
                      value={item.discount || 0}
                      onChange={(e) =>
                        updateItem(index, "discount", Number(e.target.value))
                      }
                      className="w-[130px] rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                    />
                  </td>

                  {/* FINAL */}

                  <td className="px-3 py-4">
                    <input
                      type="number"
                      value={item.finalCost || 0}
                      readOnly
                      className="w-[130px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-right text-sm font-semibold"
                    />
                  </td>

                  {/* FREQUENCY */}

                  <td className="px-3 py-4">
                    <input
                      type="text"
                      value={item.frequency || ""}
                      readOnly
                      className="w-[120px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                    />
                  </td>

                  {/* DELETE */}

                  <td className="px-3 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => deleteServiceRow(index)}
                      className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600"
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

        <div className="border-t border-gray-200 px-6 py-6">
          <div className="ml-auto max-w-md">
            <div className="flex justify-between border-b py-3 text-sm">
              <span className="text-gray-600">Subtotal</span>

              <span className="font-semibold">{currency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between border-b py-3 text-sm">
              <span className="text-gray-600">GST (%)</span>

              <input
                type="number"
                min="0"
                max="100"
                value={gst}
                onChange={(e) => setGst(Number(e.target.value))}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
              />
            </div>

            <div className="flex justify-between py-4 text-lg font-bold">
              <span>Grand Total</span>

              <span className="text-green-700">{currency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          ADDITIONAL DETAILS
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="font-semibold text-gray-900">Additional Details</h2>

          <p className="mt-1 text-sm text-gray-500">
            Add quotation scope, process and terms.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Scope of Work
            </label>

            <textarea
              rows={4}
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
              placeholder="Enter scope of work..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Implementation Process
            </label>

            <textarea
              rows={4}
              value={implementationProcess}
              onChange={(e) => setImplementationProcess(e.target.value)}
              placeholder="Enter implementation process..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Post Sales Support & Training
            </label>

            <textarea
              rows={4}
              value={supportTraining}
              onChange={(e) => setSupportTraining(e.target.value)}
              placeholder="Enter support and training details..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Remarks</label>

            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Terms & Conditions
            </label>

            <textarea
              rows={5}
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Enter terms and conditions..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
            />
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-5">
          <button
            type="button"
            onClick={() => navigate(`/quotations/${quotation.id}`)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}
