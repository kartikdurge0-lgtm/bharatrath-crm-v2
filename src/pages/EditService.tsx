import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ServiceStatus = "Active" | "Inactive";

type ServiceCategory =
  | "Website"
  | "App"
  | "Digital Marketing"
  | "Domain & Hosting"
  | "AMC"
  | "Software"
  | "Other";

type BillingType = "One Time" | "Monthly" | "Yearly" | "As Required";

type Service = {
  id: number;
  name: string;
  category: ServiceCategory | null;
  description: string | null;
  default_price: number | null;
  billing_type: BillingType;
  sac_code: string | null;
  gst_percent: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function EditService() {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId: string }>();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    service_name: "",
    category: "" as ServiceCategory | "",
    description: "",
    default_price: "",
    billing_type: "One Time" as BillingType,
    sac_code: "",
    gst_percent: "18",
    status: "Active" as ServiceStatus,
    notes: "",
  });

  /* =====================================================
     CONVERT SRV-001 → DATABASE ID 1
  ===================================================== */

  const getDatabaseId = (value: string | undefined): number | null => {
    if (!value) {
      return null;
    }

    const match = value.match(/^SRV-(\d+)$/i);

    if (!match) {
      return null;
    }

    const id = Number(match[1]);

    return Number.isFinite(id) ? id : null;
  };

  /* =====================================================
     LOAD SERVICE
  ===================================================== */

  const loadService = useCallback(async () => {
    const databaseId = getDatabaseId(serviceId);

    if (!databaseId) {
      setService(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", databaseId)
      .maybeSingle();

    if (error) {
      console.error("Service load error:", error);
      window.alert(error.message);
      setService(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setService(null);
      setLoading(false);
      return;
    }

    const loadedService = data as Service;

    setService(loadedService);

    setForm({
      service_name: loadedService.name || "",

      category: loadedService.category || "",

      description: loadedService.description || "",

      default_price:
        loadedService.default_price !== null
          ? String(loadedService.default_price)
          : "",

      billing_type: loadedService.billing_type || "One Time",

      sac_code: loadedService.sac_code || "",

      gst_percent:
        loadedService.gst_percent !== null
          ? String(loadedService.gst_percent)
          : "18",

      status: loadedService.is_active ? "Active" : "Inactive",

      notes: loadedService.notes || "",
    });

    setLoading(false);
  }, [serviceId]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadService();
  }, [loadService]);

  /* =====================================================
     UPDATE FORM FIELD
  ===================================================== */

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =====================================================
     SAVE CHANGES
  ===================================================== */

  async function handleSubmit() {
    if (!service) {
      return;
    }

    /* SERVICE NAME */

    if (!form.service_name.trim()) {
      window.alert("Please enter the service name.");
      return;
    }

    /* CATEGORY */

    if (!form.category) {
      window.alert("Please select a category.");
      return;
    }

    /* PRICE */

    if (!form.default_price.trim()) {
      window.alert("Please enter the default price.");
      return;
    }

    const price = Number(form.default_price);

    if (Number.isNaN(price) || price < 0) {
      window.alert("Please enter a valid default price.");
      return;
    }

    /* GST */

    const gst = Number(form.gst_percent);

    if (![0, 5, 12, 18, 28].includes(gst)) {
      window.alert("Please select a valid GST percentage.");
      return;
    }

    setSaving(true);

    /* =====================================================
       UPDATE SUPABASE

       IMPORTANT:
       Database column = name
       Form field = service_name
    ===================================================== */

    const { data, error } = await supabase
      .from("services")
      .update({
        name: form.service_name.trim(),

        category: form.category,

        description: form.description.trim() || null,

        default_price: price,

        billing_type: form.billing_type,

        sac_code: form.sac_code.trim() || null,

        gst_percent: gst,

        is_active: form.status === "Active",

        notes: form.notes.trim() || null,

        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      console.error("Service update error:", error);

      window.alert(error.message);
      return;
    }

    if (!data) {
      window.alert("Service could not be updated.");
      return;
    }

    setService(data as Service);

    window.alert("Service updated successfully.");

    navigate(`/services/SRV-${String(service.id).padStart(3, "0")}`);
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-600" />

        <p className="text-sm text-gray-500">Loading service...</p>
      </div>
    );
  }

  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!service) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Service Not Found
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The requested service could not be found.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/services")}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Back to Services
        </button>
      </div>
    );
  }

  const displayServiceId = `SRV-${String(service.id).padStart(3, "0")}`;

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Service</h2>

          <p className="mt-1 text-sm text-gray-500">
            Service ID: {displayServiceId}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/services/${displayServiceId}`)}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      {/* =====================================================
          FORM CARD
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* HEADER */}

        <div className="border-b border-gray-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-900">
            Service Information
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Update the service details below.
          </p>
        </div>

        {/* FORM */}

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {/* SERVICE NAME */}

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

          {/* CATEGORY */}

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

          {/* DEFAULT PRICE */}

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

          {/* BILLING TYPE */}

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

          {/* SAC CODE */}

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

          {/* DESCRIPTION */}

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

          {/* STATUS */}

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

          {/* NOTES */}

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

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(`/services/${displayServiceId}`)}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
