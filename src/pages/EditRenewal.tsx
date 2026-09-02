import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRenewal, updateRenewal, type Renewal } from "../data/renewalStore";
import { getClients, type Client } from "../data/clientStore";

export default function EditRenewal() {
  const navigate = useNavigate();
  const { renewalId } = useParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [renewal, setRenewal] = useState<Renewal | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    service: "",
    renewalDate: "",
    amount: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------
     Load renewal + clients
  -------------------------------- */
  useEffect(() => {
    if (!renewalId) {
      setLoading(false);
      return;
    }

    const existingRenewal = getRenewal(renewalId);

    const existingClients = getClients().filter((client) => !client.archived);

    setClients(existingClients);

    if (existingRenewal) {
      setRenewal(existingRenewal);

      setForm({
        clientId: existingRenewal.clientId,
        service: existingRenewal.service,
        renewalDate: existingRenewal.renewalDate,
        amount: String(existingRenewal.amount),
        notes: existingRenewal.notes || "",
      });
    }

    setLoading(false);
  }, [renewalId]);

  /* --------------------------------
     Update field
  -------------------------------- */
  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* --------------------------------
     Calculate status
  -------------------------------- */
  const getStatus = (date: string): Renewal["status"] => {
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
     Save changes
  -------------------------------- */
  const handleSubmit = () => {
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

    if (Number.isNaN(amount) || amount < 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    const selectedClient = clients.find(
      (client) => client.id === form.clientId,
    );

    const updated = updateRenewal(renewalId, {
      clientId: form.clientId,

      clientName:
        selectedClient?.company || renewal?.clientName || "Unknown Client",

      service: form.service.trim(),

      renewalDate: form.renewalDate,

      amount,

      status: getStatus(form.renewalDate),

      notes: form.notes.trim(),
    });

    if (!updated) {
      window.alert("Renewal could not be updated.");
      return;
    }

    setRenewal(updated);

    window.alert("Renewal updated successfully.");

    navigate(`/renewals/${updated.id}`);
  };

  /* --------------------------------
     Loading
  -------------------------------- */
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Loading renewal...</p>
      </div>
    );
  }

  /* --------------------------------
     Not found
  -------------------------------- */
  if (!renewal) {
    return (
      <div className="space-y-6">
        <div>
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
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Back to Renewals
        </button>
      </div>
    );
  }

  const previewStatus = getStatus(form.renewalDate);

  return (
    <div className="space-y-6">
      {/* --------------------------------
          Header
      -------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Edit Renewal</h2>

          <p className="mt-1 text-sm text-slate-500">
            Renewal ID: {renewal.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/renewals/${renewal.id}`)}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back
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
            Update the renewal details below.
          </p>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* Client */}
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
          </div>

          {/* Service */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Service *
            </label>

            <input
              type="text"
              value={form.service}
              onChange={(e) => updateField("service", e.target.value)}
              placeholder="e.g. Website Hosting"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
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
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
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
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pl-9 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Add renewal notes..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* Status Preview */}
        <div className="mx-6 mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Status
              </p>

              <p className="mt-1 text-sm text-slate-700">
                Status is calculated from the renewal date.
              </p>
            </div>

            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${
                previewStatus === "Upcoming"
                  ? "bg-green-50 text-green-700"
                  : previewStatus === "Due Soon"
                    ? "bg-yellow-50 text-yellow-700"
                    : previewStatus === "Overdue"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-700"
              }`}
            >
              {previewStatus}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(`/renewals/${renewal.id}`)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
