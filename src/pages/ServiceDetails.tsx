import { useNavigate, useParams } from "react-router-dom";
import {
  activateService,
  deactivateService,
  deleteService,
  getService,
  type Service,
} from "../data/serviceStore";

import { useEffect, useState } from "react";

export default function ServiceDetails() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    if (!serviceId) {
      return;
    }

    const found = getService(serviceId);
    setService(found);
  }, [serviceId]);

  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!service) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Service Not Found
          </h2>

          <p className="mt-2 text-gray-500">
            The requested service could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate("/services")}
            className="mt-6 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
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

  const serviceName = service.service_name || service.serviceName || "";

  const price = Number(service.default_price ?? service.defaultPrice ?? 0);

  const billingType = service.billing_type || service.billingType || "One Time";

  const sacCode = service.sac_code || service.sacCode || "";

  const gstPercent = service.gst_percent ?? service.gstPercent ?? 18;

  /* =====================================================
     DELETE
  ===================================================== */

  function handleDelete() {
    if (!service) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${service.service_name}"?`,
    );

    if (!confirmed) {
      return;
    }

    const deleted = deleteService(service.id);

    if (deleted) {
      navigate("/services");
    }
  }

  /* =====================================================
     ACTIVATE / DEACTIVATE
  ===================================================== */

  function handleStatusChange() {
    if (!service) {
      return;
    }

    let updated: Service | null = null;

    if (service.status === "Active") {
      updated = deactivateService(service.id);
    } else {
      updated = activateService(service.id);
    }

    if (updated) {
      setService(updated);
    }
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-full bg-gray-50 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Details</h1>

          <p className="text-sm text-gray-500 mt-1">View service information</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => navigate(`/services/${service.id}/edit`)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Edit Service
          </button>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* TITLE */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Service ID</p>

            <h2 className="text-xl font-semibold text-gray-900 mt-1">
              {service.id}
            </h2>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              service.status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {service.status}
          </span>
        </div>

        {/* SERVICE INFORMATION */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">
            Service Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SERVICE NAME */}
            <div>
              <p className="text-sm text-gray-500">Service Name</p>

              <p className="mt-1 font-medium text-gray-900">
                {serviceName || "—"}
              </p>
            </div>

            {/* CATEGORY */}
            <div>
              <p className="text-sm text-gray-500">Category</p>

              <p className="mt-1 font-medium text-gray-900">
                {service.category || "—"}
              </p>
            </div>

            {/* PRICE */}
            <div>
              <p className="text-sm text-gray-500">Default Price</p>

              <p className="mt-1 font-semibold text-gray-900">
                ₹{price.toLocaleString("en-IN")}
              </p>
            </div>

            {/* BILLING */}
            <div>
              <p className="text-sm text-gray-500">Billing Type</p>

              <p className="mt-1 font-medium text-gray-900">{billingType}</p>
            </div>

            {/* SAC */}
            <div>
              <p className="text-sm text-gray-500">SAC Code</p>

              <p className="mt-1 font-medium text-gray-900">{sacCode || "—"}</p>
            </div>

            {/* GST */}
            <div>
              <p className="text-sm text-gray-500">GST</p>

              <p className="mt-1 font-medium text-gray-900">{gstPercent}%</p>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Description
            </h3>

            <div className="min-h-[90px] rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {service.description || "No description added."}
            </div>
          </div>

          {/* NOTES */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>

            <div className="min-h-[70px] rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {service.notes || "No notes added."}
            </div>
          </div>

          {/* DATES */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Created</p>

              <p className="mt-1 text-sm text-gray-900">
                {service.createdAt
                  ? new Date(service.createdAt).toLocaleString("en-IN")
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Last Updated</p>

              <p className="mt-1 text-sm text-gray-900">
                {service.updatedAt
                  ? new Date(service.updatedAt).toLocaleString("en-IN")
                  : "Not updated"}
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="p-6 border-t border-gray-200 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStatusChange}
            className={`px-4 py-2 rounded-lg text-white ${
              service.status === "Active"
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {service.status === "Active"
              ? "Deactivate Service"
              : "Activate Service"}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/services/${service.id}/edit`)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete Service
          </button>
        </div>
      </div>
    </div>
  );
}
