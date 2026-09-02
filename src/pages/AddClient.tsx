import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { addClient, getClients, getClientById } from "../data/clientStore";
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

  /*
   * Prefill client information from Lead
   */
  useEffect(() => {
    if (!leadId) return;

    const lead = getLead(leadId);

    if (!lead) {
      setError("Lead not found.");
      return;
    }

    setCompany(lead.companyName || "");
    setContactPerson(lead.contactPerson || "");
    setPhone(lead.phone || "");
    setEmail(lead.email || "");
    setAddress(lead.address || "");

    if (lead.interestedService) {
      const serviceList = getServices();

      const service = serviceList.find(
        (item) => item.id === lead.interestedService,
      );

      if (service) {
        setServices(
          service.service_name || service.serviceName || lead.interestedService,
        );
      }
    }
  }, [leadId]);

  /*
   * Generate next Client ID
   * Example: CL-004 → CL-005
   */
  const generateClientId = () => {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    /*
     * Lead conversion protection
     */
    if (leadId) {
      const lead = getLead(leadId);

      if (!lead) {
        setError("Lead not found.");
        return;
      }

      /*
       * Only Won leads can become Clients
       */
      if (lead.status !== "Won") {
        setError("Only a Won lead can be converted to a client.");
        return;
      }

      /*
       * A Lead can be converted only once
       */
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
    }

    /*
     * Basic validation
     */
    if (!company.trim() && !contactPerson.trim()) {
      setError("Please enter company name or contact person.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter phone number.");
      return;
    }

    /*
     * Duplicate Client check
     */
    const clients = getClients();

    const normalizedPhone = phone.replace(/\D/g, "");

    const duplicate = clients.find((client) => {
      const existingPhone = client.phone.replace(/\D/g, "");

      const samePhone =
        normalizedPhone && existingPhone && normalizedPhone === existingPhone;

      const sameEmail =
        email.trim() &&
        client.email.trim() &&
        email.trim().toLowerCase() === client.email.trim().toLowerCase();

      const sameCompany =
        company.trim() &&
        client.company.trim() &&
        company.trim().toLowerCase() === client.company.trim().toLowerCase();

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

    /*
     * Create Client
     */
    const client: Client = {
      id: generateClientId(),
      company: company.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      gst: gst.trim().toUpperCase(),
      services: services.trim() || "Not Assigned",
      status,
      archived: false,
    };

    addClient(client);

    /*
     * Lead → Client relationship
     */
    if (leadId) {
      const lead = getLead(leadId);

      if (lead) {
        updateLead(lead.id, {
          status: "Won",
          convertedClientId: client.id,
          convertedAt: new Date().toISOString(),
        });
      }
    }

    /*
     * Open newly created Client
     */
    navigate(`/clients/${client.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(fromLead ? `/leads/${leadId}` : "/clients")}
          className="mb-3 text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          {fromLead ? "Convert Lead to Client" : "Add Client"}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {fromLead
            ? "Review the lead information and create a client."
            : "Add a new client to Bharatrath CRM."}
        </p>
      </div>

      {/* Lead Conversion Notice */}
      {fromLead && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Lead information has been prefilled.
          </p>

          <p className="mt-1 text-xs text-green-700">
            Review the details and add any client-specific information before
            saving.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-5 text-base font-semibold text-gray-900">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Address
            </label>

            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={3}
              placeholder="Enter address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
        </section>

        {/* Business Information */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-5 text-base font-semibold text-gray-900">
            Business Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="GST Number"
              value={gst}
              onChange={setGst}
              placeholder="Enter GST number"
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Services
              </label>

              <input
                value={services}
                onChange={(event) => setServices(event.target.value)}
                placeholder="Website, POS, Hosting..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              >
                <option value="Active">Active</option>

                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(fromLead ? `/leads/${leadId}` : "/clients")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            {fromLead ? "Create Client" : "Save Client"}
          </button>
        </div>
      </form>
    </div>
  );
}

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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
    </div>
  );
}
