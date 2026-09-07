import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getClientById,
  getClients,
  updateClient,
  type Client,
} from "../data/clientStore";

export default function EditClient() {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =================================================
     LOAD CLIENT
  ================================================= */

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const existingClient = getClientById(clientId);

    if (existingClient) {
      setClient(existingClient);
    }

    setLoading(false);
  }, [clientId]);

  /* =================================================
     LOADING
  ================================================= */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] min-w-0 p-1 sm:p-2">
        <p className="text-sm text-gray-500">Loading client...</p>
      </div>
    );
  }

  /* =================================================
     CLIENT NOT FOUND
  ================================================= */

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Client Not Found
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The requested client could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  /* =================================================
     HANDLE CHANGE
  ================================================= */

  const handleChange = (field: keyof Client, value: string) => {
    setError("");

    setClient((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  };

  /* =================================================
     SAVE CLIENT
  ================================================= */

  const handleSave = () => {
    if (saving) return;

    setError("");

    /* -----------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------- */

    if (!client.company.trim() && !client.contactPerson.trim()) {
      setError("Please enter company name or contact person.");
      return;
    }

    if (!client.contactPerson.trim()) {
      setError("Contact person is required.");
      return;
    }

    if (!client.phone.trim()) {
      setError("Mobile number is required.");
      return;
    }

    /* -----------------------------------------------
       DUPLICATE CLIENT PROTECTION

       Current client is ignored.
       Archived clients are also checked.
    ----------------------------------------------- */

    const clients = getClients();

    const normalizedPhone = client.phone.replace(/\D/g, "");
    const normalizedEmail = client.email.trim().toLowerCase();
    const normalizedCompany = client.company.trim().toLowerCase();

    const duplicate = clients.find((existingClient) => {
      /* Ignore current client */

      if (existingClient.id === client.id) {
        return false;
      }

      const existingPhone = existingClient.phone.replace(/\D/g, "");

      const existingEmail = existingClient.email.trim().toLowerCase();

      const existingCompany = existingClient.company.trim().toLowerCase();

      const samePhone =
        normalizedPhone && existingPhone && normalizedPhone === existingPhone;

      const sameEmail =
        normalizedEmail && existingEmail && normalizedEmail === existingEmail;

      const sameCompany =
        normalizedCompany &&
        existingCompany &&
        normalizedCompany === existingCompany;

      return Boolean(samePhone || sameEmail || sameCompany);
    });

    /* -----------------------------------------------
       DUPLICATE ERROR
    ----------------------------------------------- */

    if (duplicate) {
      let duplicateField = "details";

      if (
        normalizedPhone &&
        duplicate.phone.replace(/\D/g, "") === normalizedPhone
      ) {
        duplicateField = "mobile number";
      } else if (
        normalizedEmail &&
        duplicate.email.trim().toLowerCase() === normalizedEmail
      ) {
        duplicateField = "email";
      } else if (
        normalizedCompany &&
        duplicate.company.trim().toLowerCase() === normalizedCompany
      ) {
        duplicateField = "company name";
      }

      setError(
        `Another client already exists with the same ${duplicateField}: ${
          duplicate.company || duplicate.contactPerson
        } (${duplicate.id}).`,
      );

      return;
    }

    /* -----------------------------------------------
       UPDATE
    ----------------------------------------------- */

    try {
      setSaving(true);

      const updatedClient: Client = {
        ...client,

        /*
         * Trim user-entered values before saving.
         */
        company: client.company.trim(),

        contactPerson: client.contactPerson.trim(),

        phone: client.phone.trim(),

        email: client.email.trim(),

        address: client.address.trim(),

        gst: client.gst.trim().toUpperCase(),

        services: client.services.trim() || "Not Assigned",

        status: client.status.trim() || "Active",
      };

      /*
       * Client ID and archive state remain unchanged.
       *
       * Historical invoices / quotations are not
       * modified here.
       */
      updateClient(updatedClient);

      navigate(`/clients/${updatedClient.id}`);
    } catch (err) {
      console.error("Failed to update client:", err);

      setError(err instanceof Error ? err.message : "Failed to update client.");
    } finally {
      setSaving(false);
    }
  };

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Edit Client
          </h2>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Update client information
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/clients/${client.id}`)}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto"
        >
          ← Back to Client
        </button>
      </div>

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
          FORM CARD
      ================================================= */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card Header */}

        <div className="border-b border-gray-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Client Information
          </h3>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Update the client's details below.
          </p>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 md:grid-cols-2">
          {/* =================================================
              COMPANY NAME
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="company-name"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Company Name{" "}
              {!client.contactPerson && <span className="text-red-500">*</span>}
            </label>

            <input
              id="company-name"
              type="text"
              value={client.company}
              onChange={(e) => handleChange("company", e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* =================================================
              CONTACT PERSON
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="contact-person"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Contact Person <span className="text-red-500">*</span>
            </label>

            <input
              id="contact-person"
              type="text"
              value={client.contactPerson}
              onChange={(e) => handleChange("contactPerson", e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* =================================================
              MOBILE
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="mobile-number"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Mobile Number <span className="text-red-500">*</span>
            </label>

            <input
              id="mobile-number"
              type="text"
              inputMode="tel"
              value={client.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* =================================================
              EMAIL
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="client-email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>

            <input
              id="client-email"
              type="email"
              value={client.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* =================================================
              ADDRESS
          ================================================= */}

          <div className="min-w-0 md:col-span-2">
            <label
              htmlFor="client-address"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Address
            </label>

            <textarea
              id="client-address"
              rows={3}
              value={client.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="min-h-[88px] w-full min-w-0 resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:px-4"
            />
          </div>

          {/* =================================================
              GST
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="gst-number"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              GST Number
            </label>

            <input
              id="gst-number"
              type="text"
              value={client.gst}
              onChange={(e) =>
                handleChange("gst", e.target.value.toUpperCase())
              }
              placeholder="ENTER GST NUMBER"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm uppercase outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* =================================================
              STATUS
          ================================================= */}

          <div className="min-w-0">
            <label
              htmlFor="client-status"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Status
            </label>

            <select
              id="client-status"
              value={client.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            >
              <option value="Active">Active</option>

              <option value="Pending">Pending</option>

              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* =================================================
              SERVICES
          ================================================= */}

          <div className="min-w-0 md:col-span-2">
            <label
              htmlFor="client-services"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Services
            </label>

            <input
              id="client-services"
              type="text"
              value={client.services}
              onChange={(e) => handleChange("services", e.target.value)}
              placeholder="Example: Website + Hosting"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 sm:h-11 sm:px-4"
            />
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5 sm:py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
