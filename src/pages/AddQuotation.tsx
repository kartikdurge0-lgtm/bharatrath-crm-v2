import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  addQuotation,
  calculateQuotationTotals,
  generateQuotationId,
  getQuotations,
  type Quotation,
  type QuotationItem,
  type QuotationStatus,
} from "../data/quotationStore";

import { getClients, type Client } from "../data/clientStore";

import { getLeads, getLead, type Lead } from "../data/leadStore";

import { getServices, type Service } from "../data/serviceStore";

import {
  getActiveSalesPersons,
  type SalesPerson,
} from "../data/salesPersonStore";

/* =========================================================
   CONSTANTS
========================================================= */

const QUOTATION_SETTINGS_KEY = "crm-settings-quotation";

/* =========================================================
   HELPERS
========================================================= */

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyItem(): QuotationItem {
  return {
    serviceId: "",
    description: "",
    sac: "",
    basicCost: 0,
    discountedCost: 0,
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
   QUOTATION NUMBERING
========================================================= */

type QuotationNumberSettings = {
  prefix: string;
  nextNumber: string;
  validity: string;
  notes: string;
  terms: string;
};

const defaultQuotationNumberSettings: QuotationNumberSettings = {
  prefix: "QUO-",
  nextNumber: "001",
  validity: "15",
  notes: "",
  terms: "",
};

function getQuotationNumberSettings(): QuotationNumberSettings {
  const saved = localStorage.getItem(QUOTATION_SETTINGS_KEY);

  if (!saved) {
    return defaultQuotationNumberSettings;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<QuotationNumberSettings>;

    return {
      ...defaultQuotationNumberSettings,
      ...parsed,
    };
  } catch {
    return defaultQuotationNumberSettings;
  }
}

function getNextQuotationNumber(): string {
  const settings = getQuotationNumberSettings();

  const prefix = settings.prefix.trim() || "QUO-";

  const nextNumber = Math.max(1, Number(settings.nextNumber) || 1);

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function incrementQuotationNumber(): void {
  const settings = getQuotationNumberSettings();

  const currentNumber = Math.max(1, Number(settings.nextNumber) || 1);

  const updatedSettings: QuotationNumberSettings = {
    ...settings,
    nextNumber: String(currentNumber + 1).padStart(3, "0"),
  };

  localStorage.setItem(QUOTATION_SETTINGS_KEY, JSON.stringify(updatedSettings));
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AddQuotation() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  /* -------------------------------------------------------
     Data
  ------------------------------------------------------- */

  const clients = useMemo<Client[]>(() => getClients(), []);

  const services = useMemo<Service[]>(() => getServices(), []);

  const [leads, setLeads] = useState<Lead[]>([]);

  const [selectedInitialLead, setSelectedInitialLead] = useState<Lead | null>(
    null,
  );

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

  const [loadingLeads, setLoadingLeads] = useState(true);

  /* -------------------------------------------------------
     Load Leads From Supabase
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadLeads() {
      try {
        setLoadingLeads(true);

        const data = await getLeads();

        if (!mounted) {
          return;
        }

        setLeads(data);
      } catch (error) {
        console.error("Failed to load leads:", error);

        if (mounted) {
          setLeads([]);
        }
      } finally {
        if (mounted) {
          setLoadingLeads(false);
        }
      }
    }

    loadLeads();

    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------------------------------
     Load Sales Persons
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadSalesPersons() {
      try {
        const persons = await getActiveSalesPersons();

        if (!mounted) {
          return;
        }

        setSalesPersons(
          persons.filter(
            (person) => person.type === "Staff" || person.type === "Part-time",
          ),
        );
      } catch (error) {
        console.error("Failed to load sales persons:", error);

        if (mounted) {
          setSalesPersons([]);
        }
      }
    }

    loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------------------------------
     URL Prefill
  ------------------------------------------------------- */

  const initialLeadId = searchParams.get("leadId") || "";

  /* -------------------------------------------------------
     Load Initial Lead
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadInitialLead() {
      if (!initialLeadId) {
        setSelectedInitialLead(null);
        return;
      }

      try {
        const lead = await getLead(initialLeadId);

        if (mounted) {
          setSelectedInitialLead(lead);
        }
      } catch (error) {
        console.error("Failed to load initial lead:", error);

        if (mounted) {
          setSelectedInitialLead(null);
        }
      }
    }

    loadInitialLead();

    return () => {
      mounted = false;
    };
  }, [initialLeadId]);

  /* -------------------------------------------------------
     Form State
  ------------------------------------------------------- */

  const [clientId, setClientId] = useState("");

  const [leadId, setLeadId] = useState(initialLeadId);

  const [salesPersonId, setSalesPersonId] = useState("");

  const [quotationDate, setQuotationDate] = useState(getToday());

  const [validUntil, setValidUntil] = useState("");

  const [status, setStatus] = useState<QuotationStatus>("Draft");

  const [items, setItems] = useState<QuotationItem[]>([emptyItem()]);

  const [tax, setTax] = useState(18);

  /* -------------------------------------------------------
     More Details
  ------------------------------------------------------- */

  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const [scopeOfWork, setScopeOfWork] = useState("");

  const [implementationProcess, setImplementationProcess] = useState("");

  const [supportTraining, setSupportTraining] = useState("");

  const [remarks, setRemarks] = useState("");

  const [termsConditions, setTermsConditions] = useState("");

  const [error, setError] = useState("");

  /* =======================================================
     LAST QUOTATION PREFILL
  ======================================================= */

  useEffect(() => {
    /*
     * For a new quotation, reuse the latest quotation's
     * reusable commercial/details fields.
     *
     * Client, Lead, Sales Person, Services and quotation
     * number are intentionally NOT copied.
     */

    try {
      const quotations = getQuotations();

      if (!quotations.length) {
        return;
      }

      const latestQuotation = [...quotations].sort((a, b) => {
        const dateA = new Date(
          a.updatedAt || a.createdAt || a.quotationDate || "",
        ).getTime();

        const dateB = new Date(
          b.updatedAt || b.createdAt || b.quotationDate || "",
        ).getTime();

        return dateB - dateA;
      })[0];

      if (!latestQuotation) {
        return;
      }

      if (latestQuotation.scopeOfWork) {
        setScopeOfWork(latestQuotation.scopeOfWork);
      }

      if (latestQuotation.implementationProcess) {
        setImplementationProcess(latestQuotation.implementationProcess);
      }

      if (latestQuotation.supportTraining) {
        setSupportTraining(latestQuotation.supportTraining);
      }

      if (latestQuotation.remarks) {
        setRemarks(latestQuotation.remarks);
      }

      if (latestQuotation.termsConditions) {
        setTermsConditions(latestQuotation.termsConditions);
      }

      if (typeof latestQuotation.tax === "number") {
        setTax(latestQuotation.tax);
      }
    } catch (error) {
      console.error("Failed to load last quotation defaults:", error);
    }
  }, []);

  /* =======================================================
     INITIAL LEAD CLIENT PREFILL
  ======================================================= */

  useEffect(() => {
    if (!selectedInitialLead?.convertedClientId) {
      return;
    }

    const convertedClient = clients.find(
      (client) =>
        String(client.id) === String(selectedInitialLead.convertedClientId),
    );

    if (convertedClient) {
      setClientId(String(convertedClient.id));
    }
  }, [selectedInitialLead, clients]);

  /* =======================================================
     SELECTED RECORDS
  ======================================================= */

  const selectedClient = clients.find(
    (client) => String(client.id) === String(clientId),
  );

  const selectedLead = leads.find((lead) => String(lead.id) === String(leadId));

  const selectedSalesPerson = salesPersons.find(
    (person) => String(person.id) === String(salesPersonId),
  );

  const clientName = selectedClient?.company || "";

  const leadName = selectedLead?.companyName || "";

  /* =======================================================
     TOTALS
  ======================================================= */

  const totals = calculateQuotationTotals(items, tax);

  /* =======================================================
     LEAD CHANGE
  ======================================================= */

  async function handleLeadChange(value: string) {
    setLeadId(value);

    if (!value) {
      return;
    }

    try {
      const lead = await getLead(value);

      if (!lead) {
        return;
      }

      /*
       * If the lead has already been converted,
       * automatically select the linked client.
       */

      if (lead.convertedClientId) {
        const convertedClient = clients.find(
          (client) => String(client.id) === String(lead.convertedClientId),
        );

        if (convertedClient) {
          setClientId(String(convertedClient.id));
        }
      }
    } catch (error) {
      console.error("Failed to load selected lead:", error);
    }
  }

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

          serviceId: String(service.id),

          description,

          sac,

          basicCost,

          discountedCost: 0,

          finalCost: basicCost,

          frequency,
        };
      }),
    );
  }

  /* =======================================================
     DESCRIPTION CHANGE
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
     DISCOUNT CHANGE
  ======================================================= */

  function handleDiscountChange(index: number, value: string) {
    const discount = Math.max(0, Number(value) || 0);

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const actualDiscount = Math.min(discount, Number(item.basicCost) || 0);

        return {
          ...item,

          discountedCost: actualDiscount,

          finalCost: Math.max(0, Number(item.basicCost) - actualDiscount),
        };
      }),
    );
  }

  /* =======================================================
     ADD ITEM
  ======================================================= */

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  /* =======================================================
     REMOVE ITEM
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
     SUBMIT
  ======================================================= */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    /* -----------------------------------------------------
       Basic Validation
    ----------------------------------------------------- */

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    if (!quotationDate) {
      setError("Please select quotation date.");
      return;
    }

    if (validUntil && validUntil < quotationDate) {
      setError("Valid Until date cannot be before quotation date.");
      return;
    }

    if (items.length === 0 || items.some((item) => !item.serviceId)) {
      setError("Please select a service for every row.");
      return;
    }

    /* -----------------------------------------------------
       Get Number From Settings
    ----------------------------------------------------- */

    const quotationNumber = getNextQuotationNumber();

    /* -----------------------------------------------------
       Create Quotation
    ----------------------------------------------------- */

    const now = new Date().toISOString();

    const quotation: Quotation = {
      id: generateQuotationId(),

      leadId: leadId || undefined,

      clientId,

      clientName,

      salesPersonId: salesPersonId || undefined,

      salesPersonName: selectedSalesPerson?.name || undefined,

      quotationNumber,

      quotationDate,

      validUntil,

      status,

      items,

      tax,

      subtotal: totals.subtotal,

      taxAmount: totals.taxAmount,

      grandTotal: totals.grandTotal,

      scopeOfWork,

      implementationProcess,

      supportTraining,

      remarks,

      termsConditions,

      createdAt: now,

      updatedAt: now,
    };

    /* -----------------------------------------------------
       Save Quotation
    ----------------------------------------------------- */

    addQuotation(quotation);

    /*
     * Increment numbering only after quotation
     * has been successfully added.
     */

    incrementQuotationNumber();

    /* -----------------------------------------------------
       Navigate
    ----------------------------------------------------- */

    navigate("/quotations");
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Quotation</h2>

          <p className="mt-1 text-sm text-gray-500">
            Create a quotation for a client
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/quotations")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Quotations
        </button>
      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Quotation Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the basic quotation details.
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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

            {/* LEAD */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Related Lead
              </label>

              <select
                value={leadId}
                onChange={(event) => handleLeadChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                <option value="">
                  {loadingLeads
                    ? "Loading Leads..."
                    : "No Lead / Direct Client"}
                </option>

                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.id}
                    {" — "}
                    {lead.companyName}
                  </option>
                ))}
              </select>

              {selectedLead && (
                <p className="mt-1 text-xs text-gray-500">Lead: {leadName}</p>
              )}
            </div>

            {/* SALES PERSON */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sales Person
              </label>

              <select
                value={salesPersonId}
                onChange={(event) => setSalesPersonId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                <option value="">Select Sales Person</option>

                {salesPersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {" — "}
                    {person.type}
                  </option>
                ))}
              </select>
            </div>

            {/* QUOTATION NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quotation Number
              </label>

              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600">
                Auto Generated
              </div>

              <p className="mt-1 text-xs text-gray-400">
                Number is generated from Settings → Quotation Settings.
              </p>
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as QuotationStatus)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quotation Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={quotationDate}
                onChange={(event) => setQuotationDate(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* VALID UNTIL */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Valid Until
              </label>

              <input
                type="date"
                value={validUntil}
                min={quotationDate}
                onChange={(event) => setValidUntil(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            SERVICES
        ================================================= */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="font-semibold text-gray-900">Services</h2>

              <p className="mt-1 text-sm text-gray-500">
                Select services from Service Master.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              + Add Service
            </button>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="px-3 py-3 text-center text-sm">#</th>

                  <th className="px-3 py-3 text-left text-sm">Service</th>

                  <th className="px-3 py-3 text-left text-sm">Description</th>

                  <th className="px-3 py-3 text-left text-sm">SAC</th>

                  <th className="px-3 py-3 text-right text-sm">Basic Cost</th>

                  <th className="px-3 py-3 text-right text-sm">Discount</th>

                  <th className="px-3 py-3 text-right text-sm">Final Cost</th>

                  <th className="px-3 py-3 text-left text-sm">Frequency</th>

                  <th className="px-3 py-3 text-center text-sm">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-3 py-4 text-center text-sm">
                      {index + 1}
                    </td>

                    <td className="px-3 py-4">
                      <select
                        value={item.serviceId}
                        onChange={(event) =>
                          handleServiceChange(index, event.target.value)
                        }
                        required
                        className="w-[210px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select Service</option>

                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.service_name ||
                              service.serviceName ||
                              "Unnamed Service"}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          handleDescriptionChange(index, event.target.value)
                        }
                        placeholder="Description"
                        className="w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.sac}
                        readOnly
                        className="w-[100px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.basicCost}
                        readOnly
                        className="w-[120px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min="0"
                        max={item.basicCost}
                        step="0.01"
                        value={item.discountedCost}
                        onChange={(event) =>
                          handleDiscountChange(index, event.target.value)
                        }
                        className="w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.finalCost}
                        readOnly
                        className="w-[120px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm font-semibold"
                      />
                    </td>

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.frequency}
                        readOnly
                        className="w-[110px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </td>

                    <td className="px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}

          <div className="flex justify-end border-t border-gray-100 p-6">
            <div className="w-full max-w-sm">
              <div className="flex justify-between border-b py-3 text-sm">
                <span>Subtotal</span>

                <span className="font-medium">{currency(totals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between border-b py-3 text-sm">
                <span>GST (%)</span>

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
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right"
                />
              </div>

              <div className="flex justify-between py-4 text-lg font-bold text-gray-900">
                <span>Grand Total</span>

                <span>{currency(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            MORE DETAILS
        ================================================= */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowMoreDetails((current) => !current)}
            className="flex w-full items-center justify-between px-6 py-5 text-left"
          >
            <div>
              <h2 className="font-semibold text-gray-900">More Details</h2>

              <p className="mt-1 text-sm text-gray-500">
                Scope, implementation, support and terms are optional.
              </p>
            </div>

            <span className="text-xl text-gray-500">
              {showMoreDetails ? "−" : "+"}
            </span>
          </button>

          {showMoreDetails && (
            <div className="space-y-6 border-t border-gray-100 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Scope of Work
                </label>

                <textarea
                  rows={5}
                  value={scopeOfWork}
                  onChange={(event) => setScopeOfWork(event.target.value)}
                  placeholder="Enter scope of work..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Implementation Process
                </label>

                <textarea
                  rows={5}
                  value={implementationProcess}
                  onChange={(event) =>
                    setImplementationProcess(event.target.value)
                  }
                  placeholder="Enter implementation process..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Post Sales Support & Training
                </label>

                <textarea
                  rows={5}
                  value={supportTraining}
                  onChange={(event) => setSupportTraining(event.target.value)}
                  placeholder="Enter support and training details..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Remarks
                </label>

                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Terms & Conditions
                </label>

                <textarea
                  rows={6}
                  value={termsConditions}
                  onChange={(event) => setTermsConditions(event.target.value)}
                  placeholder="Enter terms and conditions..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mb-10 flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Quotation
          </button>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
