import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  addRenewal,
  generateRenewalId,
  type Renewal,
} from "../data/renewalStore";

import { getClients, type Client } from "../data/clientStore";
import { getServices } from "../data/serviceStore";
import SearchableClientSelect from "../components/SearchableClientSelect";

export default function AddRenewal() {
  const navigate = useNavigate();

  /* --------------------------------
     Clients
  -------------------------------- */

  const [clients, setClients] = useState<Client[]>([]);

  /* --------------------------------
     Services
  -------------------------------- */

  const [services, setServices] = useState<ReturnType<typeof getServices>>([]);

  /* --------------------------------
     Form
  -------------------------------- */

  const [form, setForm] = useState({
    clientId: "",
    service: "",
    renewalDate: "",
    amount: "",
    notes: "",
  });

  /* --------------------------------
     Load Clients & Services
  -------------------------------- */

  useEffect(() => {
    const loadedClients = getClients().filter((client) => !client.archived);

    setClients(loadedClients);

    const loadedServices = getServices().filter(
      (service) => service.status === "Active",
    );

    setServices(loadedServices);
  }, []);

  /* --------------------------------
     Selected Client
  -------------------------------- */

  const selectedClient = clients.find((client) => client.id === form.clientId);

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
     Get Initial Renewal Status
  -------------------------------- */

  const getInitialStatus = (date: string): Renewal["status"] => {
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
     Submit
  -------------------------------- */

  const handleSubmit = () => {
    if (!form.clientId) {
      window.alert("Please select a client.");
      return;
    }

    if (!form.service.trim()) {
      window.alert("Please select a service.");
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

    /* --------------------------------
       Create Renewal
    -------------------------------- */

    const newRenewal: Renewal = {
      id: generateRenewalId(),

      clientId: form.clientId,

      clientName: selectedClient?.company || "Unknown Client",

      service: form.service.trim(),

      renewalDate: form.renewalDate,

      amount,

      status: getInitialStatus(form.renewalDate),

      notes: form.notes.trim(),

      createdAt: new Date().toISOString(),
    };

    /* --------------------------------
       Save Renewal
    -------------------------------- */

    addRenewal(newRenewal);

    window.alert("Renewal added successfully.");

    navigate(`/renewals/${newRenewal.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 space-y-4 sm:space-y-6">
      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Add Renewal</h2>

          <p className="mt-1 text-sm text-slate-500">
            Add a new client service renewal
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/renewals")}
          className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          ← Back to Renewals
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
            Enter the service renewal details below.
          </p>
        </div>

        {/* Fields */}

        <div className="grid min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 md:grid-cols-2">
          {/* --------------------------------
              Client
          -------------------------------- */}

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
                No clients available. Add a client first.
              </p>
            )}
          </div>

          {/* --------------------------------
              Service
          -------------------------------- */}

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Service *
            </label>

            <select
              value={form.service}
              onChange={(e) => {
                const selectedService = services.find(
                  (service) => service.service_name === e.target.value,
                );

                updateField("service", e.target.value);

                if (selectedService) {
                  updateField("amount", String(selectedService.default_price));
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select service</option>

              {services
                .filter((service) => service.status === "Active")
                .map((service) => (
                  <option key={service.id} value={service.service_name}>
                    {service.service_name}
                  </option>
                ))}
            </select>

            {services.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No services available. Add a service first.
              </p>
            )}
          </div>

          {/* --------------------------------
              Renewal Date
          -------------------------------- */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Renewal Date *
            </label>

            <input
              type="date"
              value={form.renewalDate}
              onChange={(e) => updateField("renewalDate", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* --------------------------------
              Renewal Amount
          -------------------------------- */}

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
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-9 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* --------------------------------
              Notes
          -------------------------------- */}

          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Add any renewal notes..."
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* --------------------------------
            Renewal Status Preview
        -------------------------------- */}

        {form.clientId && form.renewalDate && (
          <div className="mx-4 mb-5 rounded-lg border border-green-100 bg-green-50 p-4 sm:mx-6 sm:mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Renewal Status Preview
            </p>

            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-medium ${
                  getInitialStatus(form.renewalDate) === "Upcoming"
                    ? "bg-green-100 text-green-700"
                    : getInitialStatus(form.renewalDate) === "Due Soon"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {getInitialStatus(form.renewalDate)}
              </span>

              <span
                title={selectedClient?.company}
                className="max-w-full truncate text-sm text-slate-600"
              >
                {selectedClient?.company}
              </span>

              {form.service && (
                <span
                  title={form.service}
                  className="max-w-full truncate text-sm text-slate-500"
                >
                  · {form.service}
                </span>
              )}
            </div>
          </div>
        )}

        {/* --------------------------------
            Footer
        -------------------------------- */}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Save Renewal
          </button>
        </div>
      </div>
    </div>
  );
}
