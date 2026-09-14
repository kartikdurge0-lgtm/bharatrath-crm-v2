import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getClientByIdFromSupabase,
  getClientsFromSupabase,
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

  const loadClient = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const existingClient = await getClientByIdFromSupabase(clientId);

      if (existingClient) {
        setClient(existingClient);
      } else {
        setClient(null);
      }
    } catch (loadError) {
      console.error("Failed to load client:", loadError);

      setClient(null);
      setError("Unable to load client details.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  /* =================================================
     REFRESH WHEN PAGE BECOMES VISIBLE
  ================================================= */

  useEffect(() => {
    const handleFocus = () => {
      void loadClient();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadClient();
      }
    };

    window.addEventListener("focus", handleFocus);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadClient]);

  /* =================================================
     LOADING
  ================================================= */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] min-w-0 p-1 sm:p-2">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm sm:px-6">
          <p className="text-sm text-slate-500">Loading client...</p>
        </div>
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

          {error ? (
            <p className="mt-2 break-words text-sm text-red-600">{error}</p>
          ) : null}
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
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  /* =================================================
     SAVE CLIENT
  ================================================= */

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setError("");

    /* -----------------------------------------------
       BASIC VALIDATION
    ----------------------------------------------- */

    const company = client.company.trim();

    const contactPerson = client.contactPerson.trim();

    const phone = client.phone.trim();

    const email = client.email.trim();

    const address = client.address.trim();

    const gst = client.gst.trim().toUpperCase();

    const services = client.services.trim();

    const status = client.status.trim() || "Active";

    if (!company && !contactPerson) {
      setError("Please enter company name or contact person.");
      return;
    }

    if (!contactPerson) {
      setError("Contact person is required.");
      return;
    }

    if (!phone) {
      setError("Mobile number is required.");
      return;
    }

    /* -----------------------------------------------
       DUPLICATE CLIENT PROTECTION

       Current client is ignored.

       Archived clients are also checked because
       duplicate company / phone / email should not
       be created by editing an existing client.
    ----------------------------------------------- */

    const clients = await getClientsFromSupabase();

    const normalizedPhone = phone.replace(/\D/g, "");

    const normalizedEmail = email.toLowerCase();

    const normalizedCompany = company.toLowerCase();

    const duplicate = clients.find((existingClient) => {
      /* Ignore current client */

      if (existingClient.id === client.id) {
        return false;
      }

      const existingPhone = existingClient.phone.replace(/\D/g, "");

      const existingEmail = existingClient.email.trim().toLowerCase();

      const existingCompany = existingClient.company.trim().toLowerCase();

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
       UPDATED CLIENT

       IMPORTANT:
       Client ID remains immutable.

       Archive state remains unchanged.

       Historical invoices / quotations are not
       modified here.
    ----------------------------------------------- */

    const updatedClient: Client = {
      ...client,

      /*
       * Immutable CRM Client ID.
       */
      id: client.id,

      /*
       * Preserve existing archive state.
       */
      archived: client.archived === true,

      /*
       * Trim user-entered values.
       */
      company,

      contactPerson,

      phone,

      email,

      address,

      gst,

      services: services || "Not Assigned",

      status,
    };

    /* -----------------------------------------------
       UPDATE
    ----------------------------------------------- */

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       * updateClient() is now asynchronous.
       *
       * Supabase update completes first.
       * Local cache is updated by the store only
       * after the database operation succeeds.
       */
      await updateClient(updatedClient);

      /*
       * Navigate only after successful save.
       */
      navigate(`/clients/${updatedClient.id}`);
    } catch (err) {
      console.error("Failed to update client:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update client. Please try again.",
      );
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
          disabled={saving}
          onClick={() => navigate(`/clients/${client.id}`)}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          ← Back to Client
        </button>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4"
        >
          <p className="break-words text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      ) : null}

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
              Company Name
            </label>

            <input
              id="company-name"
              type="text"
              value={client.company}
              onChange={(event) => handleChange("company", event.target.value)}
              disabled={saving}
              autoComplete="organization"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) =>
                handleChange("contactPerson", event.target.value)
              }
              disabled={saving}
              autoComplete="name"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) => handleChange("phone", event.target.value)}
              disabled={saving}
              autoComplete="tel"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) => handleChange("email", event.target.value)}
              disabled={saving}
              autoComplete="email"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) => handleChange("address", event.target.value)}
              disabled={saving}
              autoComplete="street-address"
              className="min-h-[88px] w-full min-w-0 resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:px-4"
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
              onChange={(event) =>
                handleChange("gst", event.target.value.toUpperCase())
              }
              disabled={saving}
              placeholder="ENTER GST NUMBER"
              autoComplete="off"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm uppercase outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) => handleChange("status", event.target.value)}
              disabled={saving}
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
              onChange={(event) => handleChange("services", event.target.value)}
              disabled={saving}
              placeholder="Example: Website + Hosting"
              className="h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:h-11 sm:px-4"
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
            onClick={() => void handleSave()}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
