import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getRenewalFromSupabase,
  updateRenewalInSupabase,
  type Renewal,
} from "../data/renewalStore";

import { getActiveClientsFromSupabase, type Client } from "../data/clientStore";

import { getServices } from "../data/serviceStore";

import SearchableClientSelect from "../components/SearchableClientSelect";

export default function EditRenewal() {
  const navigate = useNavigate();
  const { renewalId } = useParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<
    Awaited<ReturnType<typeof getServices>>
  >([]);
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({
    clientId: "",
    service: "",
    serviceId: "",
    renewalDate: "",
    amount: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------
     Load Renewal + Clients
  -------------------------------- */

  useEffect(() => {
    if (!renewalId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadData = async () => {
      try {
        setLoadError("");

        const [existingRenewal, existingClients, loadedServices] =
          await Promise.all([
            getRenewalFromSupabase(renewalId),
            getActiveClientsFromSupabase(),
            getServices(),
          ]);

        if (!mounted) {
          return;
        }

        setClients(existingClients);
        setServices(
          loadedServices.filter((service) => service.status === "Active"),
        );

        if (existingRenewal) {
          setRenewal(existingRenewal);

          setForm({
            clientId: existingRenewal.clientId,
            service: existingRenewal.service,
            serviceId: existingRenewal.serviceId || "",
            renewalDate: existingRenewal.renewalDate,
            amount: String(existingRenewal.amount),
            notes: existingRenewal.notes || "",
          });
        }
      } catch (error) {
        console.error("Failed to load renewal:", error);

        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load renewal. Please try again.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [renewalId]);

  /* --------------------------------
     Update Form Field
  -------------------------------- */

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* --------------------------------
     Calculate Status
  -------------------------------- */

  const getStatus = (date: string): Renewal["status"] => {
    /*
     * Completed renewal should remain Completed.
     */
    if (renewal?.status === "Completed") {
      return "Completed";
    }

    if (!date) {
      return "Upcoming";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const renewalDate = new Date(date);

    renewalDate.setHours(0, 0, 0, 0);

    const difference = Math.ceil(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (difference < 0) {
      return "Overdue";
    }

    if (difference <= 7) {
      return "Due Soon";
    }

    return "Upcoming";
  };

  /* --------------------------------
     Save Changes
  -------------------------------- */

  const handleSubmit = async () => {
    if (!renewalId) {
      return;
    }

    if (!form.clientId) {
      window.alert("Please select a client.");
      return;
    }

    if (!form.service.trim()) {
      window.alert("Please enter the service.");
      return;
    }

    if (!form.renewalDate) {
      window.alert("Please select the renewal date.");
      return;
    }

    if (!form.amount) {
      window.alert("Please enter the amount.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    const selectedClient = clients.find(
      (client) => client.id === form.clientId,
    );

    try {
      const updated = await updateRenewalInSupabase(renewalId, {
        clientId: form.clientId,

        clientName:
          selectedClient?.company || renewal?.clientName || "Unknown Client",

        service: form.service.trim(),

        serviceId: form.serviceId || renewal?.serviceId,

        renewalDate: form.renewalDate,

        amount,

        /*
         * Store recalculates the effective status.
         * We do not persist a page-calculated status.
         */

        notes: form.notes.trim(),
      });

      if (!updated) {
        window.alert("Renewal could not be updated.");
        return;
      }

      setRenewal(updated);

      window.alert("Renewal updated successfully.");

      navigate(`/renewals/${updated.id}`);
    } catch (error) {
      console.error("Failed to update renewal:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to update renewal. Please try again.",
      );
    }
  };

  /* --------------------------------
     Loading
  -------------------------------- */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm text-slate-500">Loading renewal...</p>
        </div>
      </div>
    );
  }

  /* --------------------------------
     Load Error
  -------------------------------- */

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">
            Unable to Load Renewal
          </h2>
          <p className="mt-1 text-sm text-red-600">{loadError}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            ← Back to Renewals
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------
     Not Found
  -------------------------------- */

  if (!renewal) {
    return (
      <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">
            Renewal Not Found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The requested renewal could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/renewals")}
          className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
        >
          Back to Renewals
        </button>
      </div>
    );
  }

  const previewStatus = getStatus(form.renewalDate);

  /* --------------------------------
     Status Class
  -------------------------------- */

  const previewStatusClass =
    previewStatus === "Upcoming"
      ? "bg-green-50 text-green-700"
      : previewStatus === "Due Soon"
        ? "bg-yellow-50 text-yellow-700"
        : previewStatus === "Overdue"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-700";

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-6">
      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Edit Renewal</h2>

          <p className="mt-1 break-all text-sm text-slate-500">
            Renewal ID: {renewal.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/renewals/${renewal.id}`)}
          className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          ← Back
        </button>
      </div>

      {/* --------------------------------
          Form Card
      -------------------------------- */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Card Header */}

        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Renewal Information
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Update the renewal details below.
          </p>
        </div>

        {/* --------------------------------
            Form
        -------------------------------- */}

        <div className="grid min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-2">
          {/* Client */}

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Client *
            </label>

            <SearchableClientSelect
              clients={clients}
              value={form.clientId}
              onChange={(clientId) => updateField("clientId", clientId)}
              placeholder="Select client"
            />

            {clients.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No active clients available.
              </p>
            )}
          </div>

          {/* Service */}

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Service *
            </label>

            <select
              value={form.serviceId}
              onChange={(e) => {
                const selectedService = services.find(
                  (service) => String(service.id) === e.target.value,
                );

                if (!selectedService) {
                  updateField("serviceId", "");
                  return;
                }

                updateField("serviceId", String(selectedService.id));
                updateField("service", selectedService.service_name);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select service</option>

              {renewal?.serviceId &&
                renewal.service &&
                !services.some(
                  (service) => String(service.id) === String(renewal.serviceId),
                ) && (
                  <option value={renewal.serviceId}>{renewal.service}</option>
                )}

              {services.map((service) => (
                <option key={service.id} value={String(service.id)}>
                  {service.service_name}
                </option>
              ))}
            </select>

            {services.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No active services available.
              </p>
            )}
          </div>

          {/* Renewal Date */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Renewal Date *
            </label>

            <input
              type="date"
              value={form.renewalDate}
              onChange={(e) => updateField("renewalDate", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Amount */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Renewal Amount *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                ₹
              </span>

              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-9 text-sm text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* Notes */}

          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Add renewal notes..."
              className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* --------------------------------
            Status Preview
        -------------------------------- */}

        <div className="mx-4 mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:mx-6 sm:mb-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Status
              </p>

              <p className="mt-1 text-sm text-slate-700">
                Status is calculated from the renewal date.
              </p>
            </div>

            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${previewStatusClass}`}
            >
              {previewStatus}
            </span>
          </div>
        </div>

        {/* --------------------------------
            Footer
        -------------------------------- */}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => navigate(`/renewals/${renewal.id}`)}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
