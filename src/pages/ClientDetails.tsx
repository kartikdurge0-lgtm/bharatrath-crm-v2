import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { archiveClient, getClientById, type Client } from "../data/clientStore";

export default function ClientDetails() {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState<Client | null>(null);
  const [showMore, setShowMore] = useState(false);

  /* =================================================
     LOAD CLIENT
  ================================================= */

  useEffect(() => {
    if (!clientId) return;

    const existingClient = getClientById(clientId);

    if (existingClient) {
      setClient(existingClient);
    }
  }, [clientId]);

  /* =================================================
     CLIENT NOT FOUND
  ================================================= */

  if (!client) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>

          <p className="mt-1 text-sm text-slate-500">
            The requested client could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  /* =================================================
     ARCHIVE CLIENT
  ================================================= */

  const handleArchive = () => {
    const confirmed = window.confirm(
      `Are you sure you want to archive "${client.company}"?`,
    );

    if (!confirmed) {
      return;
    }

    /*
      IMPORTANT:
      Archive through clientStore so the client gets
      archived: true inside crm-clients.
    */

    archiveClient(client.id);

    setShowMore(false);

    /*
      After successful archive, go back to Clients.
      The archived client will no longer appear there.
    */

    navigate("/clients");
  };

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="space-y-5">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {client.company}
          </h1>

          <p className="mt-1 text-sm text-slate-500">Client ID: {client.id}</p>
        </div>

        {/* =================================================
            HEADER ACTIONS
        ================================================= */}

        <div className="flex items-center gap-3">
          {/* Back */}

          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to Clients
          </button>

          {/* Edit */}

          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}/edit`)}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="More actions"
            >
              ⋮
            </button>

            {showMore && (
              <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleArchive}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Archive Client
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          CLIENT OVERVIEW
      ================================================= */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Client Information */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Client Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            {/* Company */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Company Name
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {client.company}
              </p>
            </div>

            {/* Client ID */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Client ID
              </p>

              <p className="mt-1 text-sm text-slate-700">{client.id}</p>
            </div>

            {/* Contact Person */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Contact Person
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {client.contactPerson}
              </p>
            </div>

            {/* Mobile */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Mobile Number
              </p>

              <p className="mt-1 text-sm text-slate-700">{client.phone}</p>
            </div>

            {/* Email */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {client.email || "—"}
              </p>
            </div>

            {/* GST */}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                GST Number
              </p>

              <p className="mt-1 text-sm text-slate-700">{client.gst || "—"}</p>
            </div>

            {/* Address */}

            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Address
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {client.address || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            CLIENT STATUS
        ================================================= */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Client Status
            </h2>
          </div>

          <div className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current Status
            </p>

            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  client.status === "Active"
                    ? "bg-green-50 text-green-700"
                    : client.status === "Pending"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {client.status}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Services
              </p>

              <div className="mt-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {client.services}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          SERVICES & ACTIVITY
      ================================================= */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Active Services */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Active Services
            </h2>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {client.services}
                </p>

                <p className="mt-1 text-xs text-slate-500">Active service</p>
              </div>

              <span className="text-xs font-medium text-green-600">Active</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Activity
            </h2>
          </div>

          <div className="p-6">
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

              <p className="mt-1 text-xs text-slate-500">{client.services}</p>
            </div>

            <div className="py-3">
              <p className="text-sm font-medium text-slate-900">
                Client status
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Currently {client.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
