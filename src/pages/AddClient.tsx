import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  addClient,
  archiveClient,
  getClients,
  getClientById,
} from "../data/clientStore";

import type { Client } from "../data/clientStore";

import { getLead, updateLead } from "../data/leadStore";

import { getServices } from "../data/serviceStore";

export default function AddClient() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const leadId = searchParams.get("leadId");

  const fromLead = Boolean(leadId);

  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gst, setGst] = useState("");
  const [services, setServices] = useState("");
  const [status, setStatus] = useState("Active");

  const [error, setError] = useState("");
  const [loadingLead, setLoadingLead] = useState(false);
  const [saving, setSaving] = useState(false);

  /* =======================================================
     LOAD LEAD DATA
  ======================================================= */

  useEffect(() => {
    if (!leadId) {
      return;
    }

    let mounted = true;

    const loadLead = async () => {
      setLoadingLead(true);
      setError("");

      try {
        const lead = await getLead(leadId);

        if (!mounted) {
          return;
        }

        if (!lead) {
          setError("Lead not found.");
          return;
        }

        /* -------------------------------------------------
           Already converted protection
        ------------------------------------------------- */

        if (lead.convertedClientId) {
          const existingClient = getClientById(lead.convertedClientId);

          if (existingClient) {
            setError(
              `This lead has already been converted to client ${existingClient.id}.`,
            );
          } else {
            setError(
              `This lead has already been converted to client ${lead.convertedClientId}.`,
            );
          }

          return;
        }

        /* -------------------------------------------------
           Only Won leads can become Clients
        ------------------------------------------------- */

        if (lead.status !== "Won") {
          setError("Only a Won lead can be converted to a client.");

          return;
        }

        /* -------------------------------------------------
           Prefill
        ------------------------------------------------- */

        setCompany(lead.companyName || "");
        setContactPerson(lead.contactPerson || "");
        setPhone(lead.phone || "");
        setEmail(lead.email || "");
        setAddress(lead.address || "");

        /* -------------------------------------------------
           Prefill Service
        ------------------------------------------------- */

        if (lead.interestedService) {
          const serviceList = getServices();

          const service = serviceList.find(
            (item) => item.id === lead.interestedService,
          );

          if (service) {
            setServices(
              service.service_name ||
                service.serviceName ||
                lead.interestedService,
            );
          } else {
            setServices(lead.interestedService);
          }
        }
      } catch (err) {
        console.error("Failed to load lead:", err);

        if (mounted) {
          setError("Failed to load lead information.");
        }
      } finally {
        if (mounted) {
          setLoadingLead(false);
        }
      }
    };

    void loadLead();

    return () => {
      mounted = false;
    };
  }, [leadId]);

  /* =======================================================
     GENERATE NEXT CLIENT ID
  ======================================================= */

  const generateClientId = (): string => {
    const clients = getClients();

    let maxNumber = 0;

    clients.forEach((client) => {
      const match = client.id.match(/^CL-(\d+)$/);

      if (match) {
        maxNumber = Math.max(maxNumber, Number(match[1]));
      }
    });

    return `CL-${String(maxNumber + 1).padStart(3, "0")}`;
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSaving(true);

    let createdClientId: string | null = null;

    try {
      /* =================================================
         1. RE-CHECK LEAD BEFORE SAVING
      ================================================= */

      let currentLead = null;

      if (leadId) {
        currentLead = await getLead(leadId);

        if (!currentLead) {
          setError("Lead not found.");
          return;
        }

        /* -----------------------------------------------
           Lead must be Won
        ----------------------------------------------- */

        if (currentLead.status !== "Won") {
          setError("Only a Won lead can be converted to a client.");

          return;
        }

        /* -----------------------------------------------
           Lead can be converted only once
        ----------------------------------------------- */

        if (currentLead.convertedClientId) {
          const existingClient = getClientById(currentLead.convertedClientId);

          if (existingClient) {
            setError(
              `This lead has already been converted to client ${existingClient.id}.`,
            );
          } else {
            setError(
              `This lead has already been converted to client ${currentLead.convertedClientId}.`,
            );
          }

          return;
        }
      }

      /* =================================================
         2. BASIC VALIDATION
      ================================================= */

      const trimmedCompany = company.trim();
      const trimmedContactPerson = contactPerson.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();
      const trimmedAddress = address.trim();
      const trimmedGst = gst.trim().toUpperCase();
      const trimmedServices = services.trim();

      if (!trimmedCompany && !trimmedContactPerson) {
        setError("Please enter company name or contact person.");

        return;
      }

      if (!trimmedPhone) {
        setError("Please enter phone number.");
        return;
      }

      /* =================================================
         3. DUPLICATE CLIENT CHECK
      ================================================= */

      const clients = getClients();

      const normalizedPhone = trimmedPhone.replace(/\D/g, "");

      const normalizedEmail = trimmedEmail.toLowerCase();

      const normalizedCompany = trimmedCompany.toLowerCase();

      const duplicate = clients.find((client) => {
        const existingPhone = client.phone.replace(/\D/g, "");

        const existingEmail = client.email.trim().toLowerCase();

        const existingCompany = client.company.trim().toLowerCase();

        const samePhone = Boolean(
          normalizedPhone && existingPhone && normalizedPhone === existingPhone,
        );

        const sameEmail = Boolean(
          normalizedEmail && existingEmail && normalizedEmail === existingEmail,
        );

        const sameCompany = Boolean(
          normalizedCompany &&
          existingCompany &&
          normalizedCompany === existingCompany,
        );

        return samePhone || sameEmail || sameCompany;
      });

      if (duplicate) {
        setError(
          `A client with similar details already exists: ${
            duplicate.company || duplicate.contactPerson
          } (${duplicate.id}).`,
        );

        return;
      }

      /* =================================================
         4. GENERATE CRM CLIENT ID
      ================================================= */

      const clientId = generateClientId();

      createdClientId = clientId;

      /* =================================================
         5. CREATE CLIENT OBJECT
      ================================================= */

      const client: Client = {
        id: clientId,

        company: trimmedCompany,

        contactPerson: trimmedContactPerson,

        phone: trimmedPhone,

        email: trimmedEmail,

        address: trimmedAddress,

        gst: trimmedGst,

        services: trimmedServices || "Not Assigned",

        status,

        archived: false,
      };

      /* =================================================
         6. SAVE CLIENT
      ================================================= */

      /*
       * addClient() waits for Supabase.
       *
       * Returns Supabase clients.id.
       *
       * Example:
       *
       * CRM ID      = CL-005
       * Supabase ID = 45
       */

      const supabaseClientId = await addClient(client);

      if (!Number.isFinite(Number(supabaseClientId))) {
        throw new Error(
          "Client was created but a valid database ID was not returned.",
        );
      }

      /* =================================================
         7. CONVERT LEAD → CLIENT
      ================================================= */

      if (leadId && currentLead) {
        /*
         * updateLead() accepts CRM client ID:
         *
         * CL-005
         *
         * leadStore resolves:
         *
         * CL-005 → clients.id = 45
         */

        const updatedLead = await updateLead(currentLead.id, {
          status: "Won",

          convertedClientId: client.id,

          convertedAt: new Date().toISOString(),
        });

        /* -----------------------------------------------
           Verify Lead update
        ----------------------------------------------- */

        if (!updatedLead) {
          throw new Error(
            "Client was created, but the lead could not be converted.",
          );
        }

        if (updatedLead.convertedClientId !== client.id) {
          throw new Error(
            "Client was created, but the lead-client relationship could not be verified.",
          );
        }
      }

      /* =================================================
         8. OPEN CLIENT
      ================================================= */

      navigate(`/clients/${client.id}`);
    } catch (err) {
      console.error("Failed to create client:", err);

      /*
       * SAFETY CLEANUP
       *
       * Never permanently delete the partially
       * created client.
       *
       * Archive it so history is preserved.
       */

      if (createdClientId) {
        try {
          const createdClient = getClientById(createdClientId);

          if (createdClient && !createdClient.archived) {
            await archiveClient(createdClientId);
          }
        } catch (archiveError) {
          console.error(
            "Failed to archive partially created client:",
            archiveError,
          );
        }
      }

      setError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     BACK NAVIGATION
  ======================================================= */

  const handleBack = () => {
    if (fromLead && leadId) {
      navigate(`/leads/${leadId}`);
      return;
    }

    navigate("/clients");
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="min-w-0">
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 inline-flex min-h-8 items-center text-sm text-gray-500 transition hover:text-gray-800"
        >
          ← Back
        </button>

        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {fromLead ? "Convert Lead to Client" : "Add Client"}
        </h1>

        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          {fromLead
            ? "Review the lead information and create a client."
            : "Add a new client to Bharatrath CRM."}
        </p>
      </div>

      {/* =================================================
          LEAD CONVERSION NOTICE
      ================================================= */}

      {fromLead && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 sm:p-4">
          <p className="text-sm font-medium text-green-800">
            {loadingLead
              ? "Loading lead information..."
              : "Lead information has been prefilled."}
          </p>

          <p className="mt-1 text-xs leading-5 text-green-700">
            Review the details and add any client-specific information before
            saving.
          </p>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4">
          <p className="break-words text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          FORM
      ================================================= */}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-5 lg:space-y-6"
      >
        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3.5 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-2">
            <Field
              label="Company Name"
              value={company}
              onChange={setCompany}
              placeholder="Enter company name"
            />

            <Field
              label="Contact Person"
              value={contactPerson}
              onChange={setContactPerson}
              placeholder="Enter contact person"
            />

            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+91 XXXXX XXXXX"
              required
            />

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="example@company.com"
            />

            <div className="min-w-0 md:col-span-2">
              <label
                htmlFor="client-address"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Address
              </label>

              <textarea
                id="client-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                placeholder="Enter address"
                className="min-h-[88px] w-full min-w-0 resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:px-4"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            BUSINESS INFORMATION
        ================================================= */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3.5 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Business Information
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-2">
            {/* GST */}

            <Field
              label="GST Number"
              value={gst}
              onChange={setGst}
              placeholder="Enter GST number"
            />

            {/* Services */}

            <div className="min-w-0">
              <label
                htmlFor="client-services"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Services
              </label>

              <input
                id="client-services"
                value={services}
                onChange={(event) => setServices(event.target.value)}
                placeholder="Website, POS, Hosting..."
                className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:h-11 sm:px-4"
              />
            </div>

            {/* Status */}

            <div className="min-w-0">
              <label
                htmlFor="client-status"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Status
              </label>

              <select
                id="client-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:h-11 sm:px-4"
              >
                <option value="Active">Active</option>

                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || loadingLead}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving..." : fromLead ? "Create Client" : "Save Client"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   FIELD COMPONENT
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={`field-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={`field-${label.toLowerCase().replace(/\s+/g, "-")}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:h-11 sm:px-4"
      />
    </div>
  );
}
