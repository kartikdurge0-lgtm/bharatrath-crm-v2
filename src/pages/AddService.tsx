import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addService,
  generateServiceId,
  type BillingType,
  type GSTPercent,
  type Service,
  type ServiceCategory,
} from "../data/serviceStore";

export default function AddService() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    service_name: "",
    category: "" as ServiceCategory | "",
    description: "",
    default_price: "",
    billing_type: "One Time" as BillingType,
    sac_code: "",
    gst_percent: "18" as string,
    status: "Active" as Service["status"],
    notes: "",
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    /* -------------------------------
       Validation
    -------------------------------- */

    if (!form.service_name.trim()) {
      window.alert("Please enter the service name.");
      return;
    }

    if (!form.category) {
      window.alert("Please select a category.");
      return;
    }

    if (!form.billing_type) {
      window.alert("Please select a billing type.");
      return;
    }

    if (!form.default_price) {
      window.alert("Please enter the default price.");
      return;
    }

    const price = Number(form.default_price);

    if (Number.isNaN(price) || price < 0) {
      window.alert("Please enter a valid default price.");
      return;
    }

    const gst = Number(form.gst_percent) as GSTPercent;

    if (![0, 5, 12, 18, 28].includes(gst)) {
      window.alert("Please select a valid GST percentage.");
      return;
    }

    /* -------------------------------
       Create Service
    -------------------------------- */

    const newService: Service = {
      id: generateServiceId(),

      service_name: form.service_name.trim(),

      category: form.category,

      description: form.description.trim(),

      default_price: price,

      billing_type: form.billing_type,

      sac_code: form.sac_code.trim(),

      gst_percent: gst,

      status: form.status,

      notes: form.notes.trim(),

      createdAt: new Date().toISOString(),
    };

    addService(newService);

    window.alert("Service added successfully.");

    navigate(`/services/${newService.id}`);
  };

  return (
    <div className="space-y-6">
      {/* --------------------------------
          Page Header
      -------------------------------- */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Service</h2>

          <p className="mt-1 text-sm text-gray-500">
            Add a new service to your service catalogue
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/services")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Services
        </button>
      </div>

      {/* --------------------------------
          Form Card
      -------------------------------- */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card Header */}

        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-900">
            Service Information
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Enter the service details below.
          </p>
        </div>

        {/* Form */}

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* Service Name */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Service Name *
            </label>

            <input
              type="text"
              value={form.service_name}
              onChange={(e) => updateField("service_name", e.target.value)}
              placeholder="e.g. Website Development"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Category */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Category *
            </label>

            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select category</option>

              <option value="Website">Website</option>

              <option value="App">App</option>

              <option value="Digital Marketing">Digital Marketing</option>

              <option value="Domain & Hosting">Domain & Hosting</option>

              <option value="AMC">AMC</option>

              <option value="Software">Software</option>

              <option value="Other">Other</option>
            </select>
          </div>

          {/* Default Price */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Default Price *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                ₹
              </span>

              <input
                type="number"
                min="0"
                value={form.default_price}
                onChange={(e) => updateField("default_price", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pl-9 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* Billing Type */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Billing Type *
            </label>

            <select
              value={form.billing_type}
              onChange={(e) => updateField("billing_type", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="One Time">One Time</option>

              <option value="Monthly">Monthly</option>

              <option value="Yearly">Yearly</option>

              <option value="As Required">As Required</option>
            </select>
          </div>

          {/* SAC Code */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              SAC Code
            </label>

            <input
              type="text"
              value={form.sac_code}
              onChange={(e) => updateField("sac_code", e.target.value)}
              placeholder="e.g. 998314"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* GST */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              GST (%)
            </label>

            <select
              value={form.gst_percent}
              onChange={(e) => updateField("gst_percent", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="0">0%</option>

              <option value="5">5%</option>

              <option value="12">12%</option>

              <option value="18">18%</option>

              <option value="28">28%</option>
            </select>
          </div>

          {/* Description */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              placeholder="Describe the service..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Status */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>

            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="Active">Active</option>

              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Notes */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
              placeholder="Add internal notes..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* --------------------------------
            Footer
        -------------------------------- */}

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Service
          </button>
        </div>
      </div>
    </div>
  );
}
