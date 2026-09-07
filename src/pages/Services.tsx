import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { type Service } from "../data/serviceStore";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 6;

/* =========================================================
   HELPERS
========================================================= */

function getServiceSequence(id: string): number {
  const match = String(id).match(/(\d+)$/);

  if (!match) return 0;

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   LATEST SERVICE FIRST
========================================================= */

function sortServicesLatestFirst(a: Service, b: Service): number {
  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;

  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

  const validA = Number.isFinite(dateA);
  const validB = Number.isFinite(dateB);

  if (validA && validB && dateA !== dateB) {
    return dateB - dateA;
  }

  if (validA && !validB) return -1;

  if (!validA && validB) return 1;

  return getServiceSequence(b.id) - getServiceSequence(a.id);
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Services() {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  /* =======================================================
     LOAD SERVICES
  ======================================================= */

  const loadServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Failed to load services:", error);
      return;
    }

    const mappedServices: Service[] = (data || []).map((service) => ({
      id: service.service_code || `SRV-${String(service.id).padStart(3, "0")}`,

      service_name: service.name,

      category: service.category || "",

      description: service.description || "",

      default_price: Number(service.default_price || 0),

      billing_type: service.billing_type,

      sac_code: service.sac_code || "",

      gst_percent: Number(service.gst_percent || 0) as Service["gst_percent"],

      status: service.is_active ? "Active" : "Inactive",

      notes: service.notes || "",

      createdAt: service.created_at ? service.created_at.substring(0, 10) : "",

      updatedAt: service.updated_at || undefined,
    }));

    setServices(mappedServices);

    console.log("Services loaded from Supabase:", mappedServices);
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadServices();
  }, []);

  /* =======================================================
     FILTER → SORT
  ======================================================= */

  const filteredServices = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return services
      .filter((service) => {
        const matchesSearch =
          searchText === "" ||
          service.service_name.toLowerCase().includes(searchText) ||
          service.id.toLowerCase().includes(searchText) ||
          service.category.toLowerCase().includes(searchText) ||
          service.description.toLowerCase().includes(searchText);

        const matchesCategory =
          categoryFilter === "all" || service.category === categoryFilter;

        const matchesStatus =
          statusFilter === "all" ||
          service.status.toLowerCase() === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort(sortServicesLatestFirst);
  }, [services, search, categoryFilter, statusFilter]);

  /* =======================================================
     RESET PAGE WHEN FILTERS CHANGE
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  /* =======================================================
     PAGINATION
  ======================================================= */

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

  /* =======================================================
     FORMAT PRICE
  ======================================================= */

  const formatPrice = (price: number) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  /* =======================================================
     STATUS
  ======================================================= */

  const getStatusClass = (status: Service["status"]) => {
    if (status === "Active") {
      return "border border-green-100 bg-green-50 text-green-700";
    }

    return "border border-slate-200 bg-slate-50 text-slate-600";
  };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalServices = services.length;

  const activeServices = services.filter(
    (service) => service.status === "Active",
  ).length;

  const inactiveServices = services.filter(
    (service) => service.status === "Inactive",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1800px] min-w-0">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Services
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your service catalogue and pricing
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-service")}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 md:w-auto"
        >
          + Add Service
        </button>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {/* TOTAL */}

        <div className="min-w-0 rounded-xl border border-slate-200 border-l-4 border-l-slate-400 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-700">
              Total Services
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm">
              🛠️
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalServices}
          </p>

          <p className="mt-1 text-xs text-slate-400">All services</p>
        </div>

        {/* ACTIVE */}

        <div className="min-w-0 rounded-xl border border-slate-200 border-l-4 border-l-green-600 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-700">
              Active Services
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-sm">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeServices}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            Available for quotation
          </p>
        </div>

        {/* INACTIVE */}

        <div className="min-w-0 rounded-xl border border-slate-200 border-l-4 border-l-slate-400 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-slate-700">
              Inactive Services
            </p>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-sm">
              ⏸
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {inactiveServices}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            Not currently available
          </p>
        </div>
      </div>

      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* SEARCH */}

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service, category or ID..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />

          {/* CATEGORY */}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
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

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Status</option>

            <option value="active">Active</option>

            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          SERVICES TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h3 className="font-semibold text-slate-900">Service Catalogue</h3>

          <p className="mt-1 text-xs text-slate-500">
            All available services and pricing
          </p>
        </div>

        {paginatedServices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
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
                      {/* SERVICE */}

                      <td className="px-5 py-3.5">
                        <div className="min-w-[220px]">
                          <p
                            className="truncate text-sm font-semibold text-slate-900"
                            title={service.service_name}
                          >
                            {service.service_name}
                          </p>

                          <p
                            className="mt-1 truncate text-xs text-slate-500"
                            title={service.id}
                          >
                            {service.id}
                          </p>

                          {service.description && (
                            <p
                              className="mt-1 max-w-[280px] truncate text-xs text-slate-400"
                              title={service.description}
                            >
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td className="px-5 py-3.5">
                        <span className="inline-flex max-w-[180px] truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {service.category || "—"}
                        </span>
                      </td>

                      {/* BILLING */}

                      <td className="px-5 py-3.5">
                        <span className="whitespace-nowrap text-sm text-slate-700">
                          {service.billing_type}
                        </span>
                      </td>

                      {/* PRICE */}

                      <td className="px-5 py-3.5">
                        <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                          {formatPrice(service.default_price)}
                        </p>
                      </td>

                      {/* GST */}

                      <td className="px-5 py-3.5">
                        <span className="whitespace-nowrap text-sm text-slate-700">
                          {service.gst_percent}%
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            service.status,
                          )}`}
                        >
                          {service.status}
                        </span>
                      </td>

                      {/* ACTIONS */}

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

            {/* =================================================
                PAGINATION
            ================================================= */}

            {totalPages > 1 && (
              <div className="border-t border-slate-100">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-center text-xs text-slate-500 sm:text-left">
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

                  <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
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
                      {
                        length: totalPages,
                      },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          currentPage === page
                            ? "bg-green-600 text-white"
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
              </div>
            )}
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
              className="mt-4 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              + Add Service
            </button>
          </div>
        )}
      </div>

      {/* =====================================================
          FOOTER COUNT
      ===================================================== */}

      {filteredServices.length > 0 && (
        <div className="mt-3 text-center text-xs text-slate-500 sm:text-left">
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
