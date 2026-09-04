import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { addSalesPerson, type SalesPersonType } from "../data/salesPersonStore";

export default function AddSalesPerson() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    type: "Staff" as SalesPersonType,
    commissionPercent: "0",
    notes: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();

    if (!name) {
      setError("Sales Person name is required.");
      return;
    }

    const commissionPercent = Number(form.commissionPercent);

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      setError("Commission must be between 0% and 100%.");
      return;
    }

    try {
      setSaving(true);

      await addSalesPerson({
        name,
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        type: form.type,
        commissionPercent,
        status: "Active",
        notes: form.notes.trim(),
      });

      navigate("/sales-persons");
    } catch (err) {
      console.error("Failed to add sales person:", err);
      setError("Failed to save Sales Person. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/sales-persons")}
          className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Sales Persons
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Add Sales Person</h1>

        <p className="mt-1 text-sm text-gray-500">
          Add a staff member, part-time salesperson or external lead provider.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Sales Person Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Mobile
            </label>

            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
              placeholder="Enter mobile number"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Type
            </label>

            <select
              value={form.type}
              onChange={(e) =>
                handleChange("type", e.target.value as SalesPersonType)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Staff">Staff</option>
              <option value="Part-time">Part-time</option>
              <option value="External">External</option>
            </select>
          </div>

          {/* Commission */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Commission (%)
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.commissionPercent}
                onChange={(e) =>
                  handleChange("commissionPercent", e.target.value)
                }
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                %
              </span>
            </div>

            <p className="mt-1.5 text-xs text-gray-500">
              Default commission for leads brought by this person.
            </p>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any internal notes..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/sales-persons")}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Sales Person"}
          </button>
        </div>
      </form>
    </div>
  );
}
