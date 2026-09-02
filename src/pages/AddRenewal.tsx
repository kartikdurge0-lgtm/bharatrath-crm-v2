import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  addRenewal,
  generateRenewalId,
  type Renewal,
} from "../data/renewalStore";

import { getClients, type Client } from "../data/clientStore";
import { getServices } from "../data/serviceStore";

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
     Get Service Name
     
     Supports common service master
     field names without breaking
     the existing serviceStore type.

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

    if (Number.isNaN(amount) || amount < 0) {
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
    <div className="space-y-6">
      {/* --------------------------------
          Header
      -------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Add Renewal</h2>

          <p className="mt-1 text-sm text-slate-500">
            Add a new client service renewal
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/renewals")}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Renewals
        </button>
      </div>

      {/* --------------------------------
          Form Card
      -------------------------------- */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Card Header */}
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Renewal Information
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Enter the service renewal details below.
          </p>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* --------------------------------
              Client
          -------------------------------- */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Client *
            </label>

            <select
              value={form.clientId}
              onChange={(e) => updateField("clientId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select client</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company} ({client.id})
                </option>
              ))}
            </select>

            {clients.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No clients available. Add a client first.
              </p>
            )}
          </div>

          {/* --------------------------------
            Service
          -------------------------------- */}
          <div>
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
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Add any renewal notes..."
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* --------------------------------
            Renewal Status Preview
        -------------------------------- */}
        {form.clientId && form.renewalDate && (
          <div className="mx-6 mb-6 rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Renewal Status Preview
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${
                  getInitialStatus(form.renewalDate) === "Upcoming"
                    ? "bg-green-100 text-green-700"
                    : getInitialStatus(form.renewalDate) === "Due Soon"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {getInitialStatus(form.renewalDate)}
              </span>

              <span className="text-sm text-slate-600">
                {selectedClient?.company}
              </span>

              <span className="text-sm text-slate-500">
                · {form.service || "Service"}
              </span>
            </div>
          </div>
        )}

        {/* --------------------------------
            Footer
        -------------------------------- */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/renewals")}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Renewal
          </button>
        </div>
      </div>
    </div>
  );
}
