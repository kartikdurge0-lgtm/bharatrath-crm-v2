import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Service = {
  id: number;
  name: string;
  description: string | null;
  default_price: number | null;
  billing_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function ServiceDetails() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     SERVICE ID
     SRV-001 -> 1
     SRV-002 -> 2
  ===================================================== */

  const getDatabaseId = (value: string | undefined): number | null => {
    if (!value) {
      return null;
    }

    const match = value.match(/^SRV-(\d+)$/i);

    if (!match) {
      return null;
    }

    const number = Number(match[1]);

    return Number.isFinite(number) ? number : null;
  };

  /* =====================================================
     LOAD SERVICE
  ===================================================== */

  const loadService = useCallback(async () => {
    if (!serviceId) {
      setError("Service ID is missing.");
      setLoading(false);
      return;
    }

    const databaseId = getDatabaseId(serviceId);

    if (!databaseId) {
      setError("Invalid service ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: supabaseError } = await supabase
      .from("services")
      .select("*")
      .eq("id", databaseId)
      .maybeSingle();

    if (supabaseError) {
      console.error("Service load error:", supabaseError);
      setError(supabaseError.message);
      setService(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setService(null);
      setError("");
      setLoading(false);
      return;
    }

    setService(data as Service);
    setLoading(false);
  }, [serviceId]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadService();
  }, [loadService]);

  /* =====================================================
     DISPLAY ID
  ===================================================== */

  const displayServiceId = service
    ? `SRV-${String(service.id).padStart(3, "0")}`
    : serviceId || "";

  /* =====================================================
     ACTIVATE / DEACTIVATE SERVICE
  ===================================================== */

  async function handleStatusChange() {
    if (!service) {
      return;
    }

    const newStatus = !service.is_active;

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${service.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    const { error: updateError } = await supabase
      .from("services")
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (updateError) {
      console.error("Status update error:", updateError);
      alert(updateError.message);
      return;
    }

    await loadService();
  }

  /* =====================================================
     DELETE
     
     CRM RULE:
     Records should never be permanently deleted.
     Therefore Delete Service = Deactivate Service.
  ===================================================== */

  async function handleDelete() {
    if (!service) {
      return;
    }

    const confirmed = window.confirm(
      `This service will be deactivated instead of permanently deleted.\n\nDo you want to continue?`,
    );

    if (!confirmed) {
      return;
    }

    const { error: updateError } = await supabase
      .from("services")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (updateError) {
      console.error("Deactivate service error:", updateError);
      alert(updateError.message);
      return;
    }

    navigate("/services");
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 p-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-600" />

            <p className="text-sm text-gray-500">Loading service...</p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     NOT FOUND / ERROR
  ===================================================== */

  if (!service) {
    return (
      <div className="min-h-full bg-gray-50 p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Service Not Found
          </h2>

          <p className="mt-2 text-gray-500">
            {error || "The requested service could not be found."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/services")}
            className="mt-6 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     HELPERS
  ===================================================== */

  const price = Number(service.default_price ?? 0);

  const statusText = service.is_active ? "Active" : "Inactive";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-full bg-gray-50 p-6">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Details</h1>

          <p className="mt-1 text-sm text-gray-500">View service information</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => navigate(`/services/${displayServiceId}/edit`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Edit Service
          </button>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* TITLE */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <p className="text-sm text-gray-500">Service ID</p>

            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              {displayServiceId}
            </h2>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              service.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {statusText}
          </span>
        </div>

        {/* SERVICE INFORMATION */}
        <div className="p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-900">
            Service Information
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* SERVICE NAME */}
            <div>
              <p className="text-sm text-gray-500">Service Name</p>

              <p className="mt-1 font-medium text-gray-900">
                {service.name || "—"}
              </p>
            </div>

            {/* BILLING TYPE */}
            <div>
              <p className="text-sm text-gray-500">Billing Type</p>

              <p className="mt-1 font-medium text-gray-900">
                {service.billing_type || "—"}
              </p>
            </div>

            {/* PRICE */}
            <div>
              <p className="text-sm text-gray-500">Default Price</p>

              <p className="mt-1 font-semibold text-gray-900">
                ₹{price.toLocaleString("en-IN")}
              </p>
            </div>

            {/* STATUS */}
            <div>
              <p className="text-sm text-gray-500">Status</p>

              <p
                className={`mt-1 font-medium ${
                  service.is_active ? "text-green-600" : "text-gray-500"
                }`}
              >
                {statusText}
              </p>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Description
            </h3>

            <div className="min-h-[90px] whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {service.description || "No description added."}
            </div>
          </div>

          {/* DATES */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Created</p>

              <p className="mt-1 text-sm text-gray-900">
                {service.created_at
                  ? new Date(service.created_at).toLocaleString("en-IN")
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Last Updated</p>

              <p className="mt-1 text-sm text-gray-900">
                {service.updated_at
                  ? new Date(service.updated_at).toLocaleString("en-IN")
                  : "Not updated"}
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 border-t border-gray-200 p-6">
          {/* ACTIVATE / DEACTIVATE */}
          <button
            type="button"
            onClick={handleStatusChange}
            className={`rounded-lg px-4 py-2 text-white ${
              service.is_active
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {service.is_active ? "Deactivate Service" : "Activate Service"}
          </button>

          {/* EDIT */}
          <button
            type="button"
            onClick={() => navigate(`/services/${displayServiceId}/edit`)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>

          {/* DELETE = DEACTIVATE */}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Delete Service
          </button>
        </div>
      </div>
    </div>
  );
}
