import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  archiveClient,
  getClientByIdFromSupabase,
  type Client,
} from "../data/clientStore";

export default function ClientDetails() {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState<Client | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
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
    loadClient();
  }, [loadClient]);

  /* =================================================
     REFRESH WHEN PAGE BECOMES VISIBLE
  ================================================= */

  useEffect(() => {
    const handleFocus = () => {
      loadClient();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadClient();
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
     LOADING STATE
  ================================================= */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1800px] min-w-0">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center shadow-sm sm:px-6">
          <p className="text-sm text-slate-500">Loading client details...</p>
        </div>
      </div>
    );
  }

  /* =================================================
     CLIENT NOT FOUND
  ================================================= */

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Client Not Found
          </h2>

          <p className="mt-1 break-words text-sm text-slate-500">
            The requested client could not be found.
          </p>

          {error ? (
            <p className="mt-2 break-words text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  /* =================================================
     ARCHIVE CLIENT
  ================================================= */

  const handleArchive = async () => {
    if (archiving) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to archive "${client.company}"?`,
    );

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setError("");

    try {
      /*
       * IMPORTANT:
       * Archive through clientStore.
       *
       * The new clientStore performs the Supabase
       * update first and then updates the local cache.
       *
       * Clients are never permanently deleted.
       */
      await archiveClient(client.id);

      setShowMore(false);

      /*
       * After successful archive, go back to the
       * active Clients list.
       */
      navigate("/clients");
    } catch (archiveError) {
      console.error("Failed to archive client:", archiveError);

      setError("Client could not be archived. Please try again.");

      setArchiving(false);
    }
  };

  /* =================================================
     STATUS STYLE
  ================================================= */

  const getStatusClass = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === "active") {
      return "bg-green-50 text-green-700";
    }

    if (normalized === "pending") {
      return "bg-yellow-50 text-yellow-700";
    }

    if (normalized === "inactive") {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-slate-100 text-slate-600";
  };

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4 sm:space-y-5">
      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="break-words">{error}</p>
        </div>
      ) : null}

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            className="truncate text-xl font-bold text-slate-900 sm:text-2xl"
            title={client.company}
          >
            {client.company}
          </h1>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Client ID: {client.id}
          </p>
        </div>

        {/* =================================================
            HEADER ACTIONS
        ================================================= */}

        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2 lg:gap-3">
          {/* Back */}

          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Back to Clients
          </button>

          {/* Edit */}

          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}/edit`)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Edit Client
          </button>

          {/* =================================================
              MORE MENU
          ================================================= */}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              disabled={archiving}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-10"
              aria-label="More actions"
              aria-expanded={showMore}
            >
              ⋮
            </button>

            {showMore ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  disabled={archiving}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {archiving ? "Archiving..." : "Archive Client"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* =================================================
          CLIENT OVERVIEW
      ================================================= */}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {/* =================================================
            CLIENT INFORMATION
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Client Information
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
            {/* Company */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Company Name
              </p>

              <p
                className="mt-1 break-words text-sm font-semibold text-slate-900"
                title={client.company}
              >
                {client.company}
              </p>
            </div>

            {/* Client ID */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Client ID
              </p>

              <p className="mt-1 break-words text-sm text-slate-700">
                {client.id}
              </p>
            </div>

            {/* Contact Person */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Contact Person
              </p>

              <p
                className="mt-1 break-words text-sm text-slate-700"
                title={client.contactPerson}
              >
                {client.contactPerson || "—"}
              </p>
            </div>

            {/* Mobile */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Mobile Number
              </p>

              <p className="mt-1 break-all text-sm text-slate-700">
                {client.phone || "—"}
              </p>
            </div>

            {/* Email */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p
                className="mt-1 break-all text-sm text-slate-700"
                title={client.email || undefined}
              >
                {client.email || "—"}
              </p>
            </div>

            {/* GST */}

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                GST Number
              </p>

              <p className="mt-1 break-all text-sm text-slate-700">
                {client.gst || "—"}
              </p>
            </div>

            {/* Address */}

            <div className="min-w-0 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Address
              </p>

              <p className="mt-1 break-words text-sm leading-6 text-slate-700">
                {client.address || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            CLIENT STATUS
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Client Status
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current Status
            </p>

            <div className="mt-3">
              <span
                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                  client.status,
                )}`}
              >
                {client.status || "Unknown"}
              </span>
            </div>

            <div className="mt-6 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Services
              </p>

              <div className="mt-3">
                <div
                  className="break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
                  title={client.services}
                >
                  {client.services || "—"}
                </div>
              </div>
            </div>

            {client.archived ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-medium text-amber-800">
                  This client is archived.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* =================================================
          SERVICES & ACTIVITY
      ================================================= */}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* =================================================
            ACTIVE SERVICES
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Active Services
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-2 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p
                  className="break-words text-sm font-medium text-slate-900"
                  title={client.services}
                >
                  {client.services || "No service assigned"}
                </p>

                <p className="mt-1 text-xs text-slate-500">Active service</p>
              </div>

              <span className="shrink-0 text-xs font-medium text-green-600">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Activity
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <div className="border-b border-slate-100 py-3">
              <p className="text-sm font-medium text-slate-900">
                Client profile created
              </p>

              <p className="mt-1 text-xs text-slate-500">Client added to CRM</p>
            </div>

            <div className="border-b border-slate-100 py-3">
              <p className="text-sm font-medium text-slate-900">
                Service added
              </p>

              <p
                className="mt-1 break-words text-xs text-slate-500"
                title={client.services}
              >
                {client.services || "No service assigned"}
              </p>
            </div>

            <div className="py-3">
              <p className="text-sm font-medium text-slate-900">
                Client status
              </p>

              <p className="mt-1 break-words text-xs text-slate-500">
                Currently {client.status || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
