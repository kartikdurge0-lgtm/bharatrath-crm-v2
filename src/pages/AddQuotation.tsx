/* =========================================================
   ADD QUOTATION
   Bharatrath CRM
========================================================= */

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
import SearchableClientSelect from "../components/SearchableClientSelect";

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
   QUOTATION NUMBER SETTINGS
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

/* =========================================================
   GET SETTINGS
========================================================= */

function getQuotationNumberSettings(): QuotationNumberSettings {
  const saved = localStorage.getItem(QUOTATION_SETTINGS_KEY);

  if (!saved) {
    return {
      ...defaultQuotationNumberSettings,
    };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<QuotationNumberSettings>;

    return {
      ...defaultQuotationNumberSettings,
      ...parsed,
    };
  } catch {
    return {
      ...defaultQuotationNumberSettings,
    };
  }
}

/* =========================================================
   GET NUMERIC PART
========================================================= */

function getQuotationNumericPart(
  quotationNumber: string,
  prefix: string,
): number {
  const safePrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = quotationNumber.match(new RegExp(`^${safePrefix}(\\d+)$`, "i"));

  if (!match) {
    return 0;
  }

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   GET SAFE NEXT NUMBER
========================================================= */

function getSafeNextQuotationNumber(): string {
  const settings = getQuotationNumberSettings();

  const prefix = settings.prefix.trim() || "QUO-";

  let nextNumber = Math.max(1, Number(settings.nextNumber) || 1);

  const quotations = getQuotations();

  let highestExistingNumber = 0;

  for (const quotation of quotations) {
    const quotationNumber = String(quotation.quotationNumber || "").trim();

    const numericPart = getQuotationNumericPart(quotationNumber, prefix);

    highestExistingNumber = Math.max(highestExistingNumber, numericPart);
  }

  if (highestExistingNumber >= nextNumber) {
    nextNumber = highestExistingNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

/* =========================================================
   INCREMENT NUMBER
========================================================= */

function incrementQuotationNumber(savedQuotationNumber?: string): void {
  const settings = getQuotationNumberSettings();

  const prefix = settings.prefix.trim() || "QUO-";

  const currentNumber = Math.max(1, Number(settings.nextNumber) || 1);

  let nextNumber = currentNumber + 1;

  if (savedQuotationNumber) {
    const savedNumericPart = getQuotationNumericPart(
      savedQuotationNumber,
      prefix,
    );

    if (savedNumericPart > 0) {
      nextNumber = Math.max(nextNumber, savedNumericPart + 1);
    }
  }

  const updatedSettings: QuotationNumberSettings = {
    ...settings,
    nextNumber: String(nextNumber).padStart(3, "0"),
  };

  localStorage.setItem(QUOTATION_SETTINGS_KEY, JSON.stringify(updatedSettings));
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AddQuotation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* =======================================================
     DATA
  ======================================================= */

  const clients = useMemo<Client[]>(() => getClients(), []);
  const services = useMemo<Service[]>(() => getServices(), []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedInitialLead, setSelectedInitialLead] = useState<Lead | null>(
    null,
  );

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  /* =======================================================
     LOAD LEADS
  ======================================================= */

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

    void loadLeads();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOAD SALES PERSONS
  ======================================================= */

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

    void loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     URL PREFILL
  ======================================================= */

  const initialLeadId = searchParams.get("leadId") || "";

  /* =======================================================
     LOAD INITIAL LEAD
  ======================================================= */

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

    void loadInitialLead();

    return () => {
      mounted = false;
    };
  }, [initialLeadId]);

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [clientId, setClientId] = useState("");
  const [leadId, setLeadId] = useState(initialLeadId);
  const [salesPersonId, setSalesPersonId] = useState("");

  const [quotationDate, setQuotationDate] = useState(getToday());

  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("Draft");

  const [items, setItems] = useState<QuotationItem[]>([emptyItem()]);

  const [tax, setTax] = useState(18);

  /* =======================================================
     MORE DETAILS
  ======================================================= */

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
    try {
      const quotations = getQuotations().filter(
        (quotation) => quotation.isArchived !== true,
      );

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
        setTax(Math.min(100, Math.max(0, latestQuotation.tax)));
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

        const basicCost = Number(item.basicCost) || 0;

        const actualDiscount = Math.min(discount, basicCost);

        return {
          ...item,
          discountedCost: actualDiscount,
          finalCost: Math.max(0, basicCost - actualDiscount),
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
       VALIDATION
    ----------------------------------------------------- */

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    if (!selectedClient) {
      setError("Selected client could not be found.");
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
       CLEAN ITEMS
    ----------------------------------------------------- */

    const cleanedItems = items.map((item) => {
      const basicCost = Math.max(0, Number(item.basicCost) || 0);

      const discountedCost = Math.min(
        basicCost,
        Math.max(0, Number(item.discountedCost) || 0),
      );

      const finalCost = Math.max(0, basicCost - discountedCost);

      return {
        ...item,
        basicCost,
        discountedCost,
        finalCost,
      };
    });

    /* -----------------------------------------------------
       FINAL TOTALS
    ----------------------------------------------------- */

    const finalTotals = calculateQuotationTotals(cleanedItems, tax);

    /* -----------------------------------------------------
       QUOTATION NUMBER
    ----------------------------------------------------- */

    const quotationNumber = getSafeNextQuotationNumber();

    /* -----------------------------------------------------
       CREATE QUOTATION
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

      items: cleanedItems,

      tax,

      subtotal: finalTotals.subtotal,

      taxAmount: finalTotals.taxAmount,

      grandTotal: finalTotals.grandTotal,

      scopeOfWork,

      implementationProcess,

      supportTraining,

      remarks,

      termsConditions,

      createdAt: now,

      updatedAt: now,
    };

    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    const savedQuotation = addQuotation(quotation);

    /* -----------------------------------------------------
       UPDATE NUMBER SETTINGS
    ----------------------------------------------------- */

    incrementQuotationNumber(savedQuotation.quotationNumber);

    /* -----------------------------------------------------
       NAVIGATE
    ----------------------------------------------------- */

    navigate("/quotations");
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 pb-8 sm:space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Add Quotation
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Create a quotation for a client
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/quotations")}
          className="w-full shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          ← Back to Quotations
        </button>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="break-safe rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="min-w-0">
        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="mb-4 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
          <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="font-semibold text-gray-900">
              Quotation Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the basic quotation details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-6 md:grid-cols-2">
            {/* CLIENT */}

            <div className="min-w-0 md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Client <span className="text-red-500">*</span>
              </label>

              <SearchableClientSelect
                clients={clients}
                value={clientId}
                onChange={setClientId}
                placeholder="Select Client"
              />
            </div>

            {/* LEAD */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Related Lead
              </label>

              <select
                value={leadId}
                onChange={(event) => void handleLeadChange(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                <option value="">
                  {loadingLeads
                    ? "Loading Leads..."
                    : "No Lead / Direct Client"}
                </option>

                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.id} — {lead.companyName}
                  </option>
                ))}
              </select>

              {selectedLead && (
                <p className="mt-1 truncate text-xs text-gray-500">
                  Lead: {leadName}
                </p>
              )}
            </div>

            {/* SALES PERSON */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sales Person
              </label>

              <select
                value={salesPersonId}
                onChange={(event) => setSalesPersonId(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                <option value="">Select Sales Person</option>

                {salesPersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.type}
                  </option>
                ))}
              </select>
            </div>

            {/* QUOTATION NUMBER */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quotation Number
              </label>

              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600">
                Auto Generated
              </div>

              <p className="mt-1 break-safe text-xs text-gray-400">
                Number is generated automatically from Quotation Settings.
              </p>
            </div>

            {/* STATUS */}

            <div className="min-w-0">
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

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Quotation Date <span className="text-red-500">*</span>
              </label>

              <input
                type="date"
                value={quotationDate}
                onChange={(event) => setQuotationDate(event.target.value)}
                required
                className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* VALID UNTIL */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Valid Until
              </label>

              <input
                type="date"
                value={validUntil}
                min={quotationDate}
                onChange={(event) => setValidUntil(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-3 text-sm"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            SERVICES
        ================================================= */}

        <section className="mb-4 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
          <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900">Services</h2>

              <p className="mt-1 text-sm text-gray-500">
                Select services from Service Master.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="w-full shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 sm:w-auto"
            >
              + Add Service
            </button>
          </div>

          <div className="overflow-x-auto p-3 sm:p-6">
            <table className="w-full min-w-[1100px]">
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
                  <tr
                    key={`${item.serviceId}-${index}`}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-4 text-center text-sm">
                      {index + 1}
                    </td>

                    {/* SERVICE */}

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

                    {/* DESCRIPTION */}

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

                    {/* SAC */}

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.sac}
                        readOnly
                        className="w-[100px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </td>

                    {/* BASIC COST */}

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.basicCost}
                        readOnly
                        className="w-[120px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm"
                      />
                    </td>

                    {/* DISCOUNT */}

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

                    {/* FINAL COST */}

                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.finalCost}
                        readOnly
                        className="w-[120px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-right text-sm font-semibold"
                      />
                    </td>

                    {/* FREQUENCY */}

                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.frequency}
                        readOnly
                        className="w-[110px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </td>

                    {/* ACTION */}

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

          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="border-t border-gray-100 p-4 sm:p-6">
            <div className="ml-auto w-full max-w-sm">
              <div className="flex items-center justify-between gap-4 border-b py-3 text-sm">
                <span>Subtotal</span>

                <span className="font-medium">{currency(totals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b py-3 text-sm">
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

              <div className="flex items-center justify-between gap-4 py-4 text-lg font-bold text-gray-900">
                <span>Grand Total</span>

                <span className="whitespace-nowrap">
                  {currency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            MORE DETAILS
        ================================================= */}

        <section className="mb-4 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6">
          <button
            type="button"
            onClick={() => setShowMoreDetails((current) => !current)}
            className="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-4 text-left sm:px-6 sm:py-5"
          >
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900">More Details</h2>

              <p className="mt-1 text-sm text-gray-500">
                Scope, implementation, support and terms are optional.
              </p>
            </div>

            <span className="shrink-0 text-xl text-gray-500">
              {showMoreDetails ? "−" : "+"}
            </span>
          </button>

          {showMoreDetails && (
            <div className="space-y-5 border-t border-gray-100 p-4 sm:space-y-6 sm:p-6">
              {/* SCOPE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Scope of Work
                </label>

                <textarea
                  rows={5}
                  value={scopeOfWork}
                  onChange={(event) => setScopeOfWork(event.target.value)}
                  placeholder="Enter scope of work..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* IMPLEMENTATION */}

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
                  className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* SUPPORT */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Post Sales Support & Training
                </label>

                <textarea
                  rows={5}
                  value={supportTraining}
                  onChange={(event) => setSupportTraining(event.target.value)}
                  placeholder="Enter support and training details..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* REMARKS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Remarks
                </label>

                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* TERMS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Terms & Conditions
                </label>

                <textarea
                  rows={6}
                  value={termsConditions}
                  onChange={(event) => setTermsConditions(event.target.value)}
                  placeholder="Enter terms and conditions..."
                  className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mb-6 flex flex-col gap-3 sm:mb-10 sm:flex-row">
          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Save Quotation
          </button>

          <button
            type="button"
            onClick={() => navigate("/quotations")}
            className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
