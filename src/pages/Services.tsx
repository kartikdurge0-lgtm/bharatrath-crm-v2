import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getServices, saveServices, type Service } from "../data/serviceStore";

const defaultServices: Service[] = [
  {
    id: "SRV-001",
    service_name: "Website Development",
    category: "Website",
    description: "Professional website development and setup.",
    default_price: 25000,
    billing_type: "One Time",
    sac_code: "998314",
    gst_percent: 18,
    status: "Active",
    notes: "",
    createdAt: "2026-08-29",
  },
  {
    id: "SRV-002",
    service_name: "Website Hosting",
    category: "Domain & Hosting",
    description: "Website hosting and server management.",
    default_price: 3500,
    billing_type: "Yearly",
    sac_code: "998315",
    gst_percent: 18,
    status: "Active",
    notes: "",
    createdAt: "2026-08-29",
  },
  {
    id: "SRV-003",
    service_name: "Domain Registration",
    category: "Domain & Hosting",
    description: "Domain registration and renewal service.",
    default_price: 1200,
    billing_type: "Yearly",
    sac_code: "998315",
    gst_percent: 18,
    status: "Active",
    notes: "",
    createdAt: "2026-08-29",
  },
  {
    id: "SRV-004",
    service_name: "Digital Marketing",
    category: "Digital Marketing",
    description: "Social media and digital marketing services.",
    default_price: 10000,
    billing_type: "Monthly",
    sac_code: "998365",
    gst_percent: 18,
    status: "Active",
    notes: "",
    createdAt: "2026-08-29",
  },
  {
    id: "SRV-005",
    service_name: "Website AMC",
    category: "AMC",
    description: "Annual website maintenance and support.",
    default_price: 5900,
    billing_type: "Yearly",
    sac_code: "998313",
    gst_percent: 18,
    status: "Active",
    notes: "",
    createdAt: "2026-08-29",
  },
];

const PAGE_SIZE = 6;

export default function Services() {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  /* --------------------------------
     Load services
  -------------------------------- */

  const loadServices = () => {
    const existingServices = getServices();

    if (existingServices.length === 0) {
      saveServices(defaultServices);
      setServices(defaultServices);
      return;
    }

    setServices(existingServices);
  };

  useEffect(() => {
    loadServices();

    window.addEventListener("focus", loadServices);

    return () => {
      window.removeEventListener("focus", loadServices);
    };
  }, []);

  /* --------------------------------
     Search + Filter
  -------------------------------- */

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        service.service_name.toLowerCase().includes(searchText) ||
        service.id.toLowerCase().includes(searchText) ||
        service.category.toLowerCase().includes(searchText) ||
        service.description.toLowerCase().includes(searchText);

      const matchesCategory =
        categoryFilter === "all" || service.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || service.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, search, categoryFilter, statusFilter]);

  /* --------------------------------
     Reset pagination
  -------------------------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  /* --------------------------------
     Pagination
  -------------------------------- */

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredServices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredServices, currentPage]);

  /* --------------------------------
     Format Price
  -------------------------------- */

  const formatPrice = (price: number) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  /* --------------------------------
     Status badge
  -------------------------------- */

  const getStatusClass = (status: Service["status"]) => {
    if (status === "Active") {
      return "border border-green-100 bg-green-50 text-green-700";
    }

    return "border border-slate-200 bg-slate-50 text-slate-600";
  };

  /* --------------------------------
     Summary counts
  -------------------------------- */

  const totalServices = services.length;

  const activeServices = services.filter(
    (service) => service.status === "Active",
  ).length;

  const inactiveServices = services.filter(
    (service) => service.status === "Inactive",
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* --------------------------------
          Page Header
      -------------------------------- */}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Services</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your service catalogue and pricing
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-service")}
          className="shrink-0 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
        >
          + Add Service
        </button>
      </div>

      {/* --------------------------------
          Summary
      -------------------------------- */}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Total */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#94A3B8] bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Total Services</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
              🛠️
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalServices}
          </p>

          <p className="mt-1 text-xs text-slate-400">All services</p>
        </div>

        {/* Active */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#16A34A] bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">
              Active Services
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-sm">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#16A34A]">
            {activeServices}
          </p>

          <p className="mt-1 text-xs text-slate-400">Available for quotation</p>
        </div>

        {/* Inactive */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#94A3B8] bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">
              Inactive Services
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
              ⏸
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {inactiveServices}
          </p>

          <p className="mt-1 text-xs text-slate-400">Not currently available</p>
        </div>
      </div>

      {/* --------------------------------
          Search + Filters
      -------------------------------- */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Search */}

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service, category or ID..."
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          />

          {/* Category */}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Categories</option>

            <option value="Website">Website</option>

            <option value="App">App</option>

            <option value="Digital Marketing">Digital Marketing</option>

            <option value="Domain & Hosting">Domain & Hosting</option>

            <option value="AMC">AMC</option>

            <option value="Software">Software</option>

            <option value="Other">Other</option>
          </select>

          {/* Status */}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Status</option>

            <option value="active">Active</option>

            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* --------------------------------
          Services Table
      -------------------------------- */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="font-semibold text-slate-900">Service Catalogue</h3>

          <p className="mt-1 text-xs text-slate-500">
            All available services and pricing
          </p>
        </div>

        {paginatedServices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F4F7FA]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Service
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Billing
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Price
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      GST
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedServices.map((service) => (
                    <tr
                      key={service.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* Service */}

                      <td className="px-5 py-3.5">
                        <div className="min-w-[220px]">
                          <p className="text-sm font-semibold text-slate-900">
                            {service.service_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {service.id}
                          </p>

                          {service.description && (
                            <p className="mt-1 max-w-[280px] truncate text-xs text-slate-400">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}

                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {service.category || "—"}
                        </span>
                      </td>

                      {/* Billing */}

                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-700">
                          {service.billing_type}
                        </span>
                      </td>

                      {/* Price */}

                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatPrice(service.default_price)}
                        </p>
                      </td>

                      {/* GST */}

                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-700">
                          {service.gst_percent}%
                        </span>
                      </td>

                      {/* Status */}

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            service.status,
                          )}`}
                        >
                          {service.status}
                        </span>
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/services/${service.id}`)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/services/${service.id}/edit`)
                            }
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --------------------------------
                Pagination
            -------------------------------- */}

            <div className="border-t border-slate-100">
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * PAGE_SIZE + 1}-
                      {Math.min(
                        currentPage * PAGE_SIZE,
                        filteredServices.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredServices.length}
                    </span>
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                    >
                      Previous
                    </button>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          currentPage === page
                            ? "bg-[#16A34A] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="mb-2 text-3xl">🛠️</div>

            <p className="text-sm font-semibold text-slate-700">
              No services found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={() => navigate("/add-service")}
              className="mt-4 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
            >
              + Add Service
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------
          Footer
      -------------------------------- */}

      {filteredServices.length > 0 && (
        <div className="mt-3 text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filteredServices.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {filteredServices.length}
          </span>{" "}
          services
        </div>
      )}
    </div>
  );
}
