import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activateSalesPerson,
  deactivateSalesPerson,
  getSalesPersons,
  type SalesPerson,
} from "../data/salesPersonStore";

const PAGE_SIZE = 6;

/* --------------------------------
   Sales Person ID sorting
   Latest / highest sequence first
-------------------------------- */

function getSalesPersonSequence(id: string): number {
  const match = id.match(/(\d+)$/);

  if (!match) return 0;

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

function sortSalesPersonsLatestFirst(a: SalesPerson, b: SalesPerson): number {
  return getSalesPersonSequence(b.id) - getSalesPersonSequence(a.id);
}

export default function SalesPersons() {
  const navigate = useNavigate();

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);

  /* --------------------------------
     Load sales persons
  -------------------------------- */

  const refresh = async () => {
    try {
      const data = await getSalesPersons();
      setSalesPersons(data);
    } catch (error) {
      console.error("Failed to load sales persons:", error);
      setSalesPersons([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  /* --------------------------------
     Filter → Sort
  -------------------------------- */

  const filteredSalesPersons = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return salesPersons
      .filter((person) => {
        const matchesSearch =
          !searchText ||
          person.name.toLowerCase().includes(searchText) ||
          person.mobile.toLowerCase().includes(searchText) ||
          person.email.toLowerCase().includes(searchText) ||
          person.id.toLowerCase().includes(searchText);

        const matchesType = typeFilter === "All" || person.type === typeFilter;

        const matchesStatus =
          statusFilter === "All" || person.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort(sortSalesPersonsLatestFirst);
  }, [salesPersons, search, typeFilter, statusFilter]);

  /* --------------------------------
     Reset pagination when filters change
  -------------------------------- */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter]);

  /* --------------------------------
     Pagination
  -------------------------------- */

  const totalPages = Math.ceil(filteredSalesPersons.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedSalesPersons = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredSalesPersons.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSalesPersons, currentPage]);

  /* --------------------------------
     Pagination page numbers
     First 2 + current area + last 2
  -------------------------------- */

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();

    pages.add(1);
    pages.add(2);
    pages.add(totalPages - 1);
    pages.add(totalPages);

    pages.add(currentPage);

    if (currentPage > 1) {
      pages.add(currentPage - 1);
    }

    if (currentPage < totalPages) {
      pages.add(currentPage + 1);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  /* --------------------------------
     Summary
  -------------------------------- */

  const activeCount = salesPersons.filter(
    (person) => person.status === "Active",
  ).length;

  const inactiveCount = salesPersons.filter(
    (person) => person.status === "Inactive",
  ).length;

  /* --------------------------------
     Toggle status
  -------------------------------- */

  const handleToggleStatus = async (person: SalesPerson) => {
    try {
      if (person.status === "Active") {
        await deactivateSalesPerson(person.id);
      } else {
        await activateSalesPerson(person.id);
      }

      await refresh();
    } catch (error) {
      console.error("Failed to update sales person status:", error);

      window.alert("Failed to update Sales Person status. Please try again.");
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* --------------------------------
          Header
      -------------------------------- */}

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Sales Persons</h1>

          <p className="mt-1 break-words text-sm text-gray-500">
            Manage sales persons and their commission settings
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-sales-person")}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
        >
          + Add Sales Person
        </button>
      </div>

      {/* --------------------------------
          Summary Cards
      -------------------------------- */}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Sales Persons</p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {salesPersons.length}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inactive</p>

          <p className="mt-2 text-2xl font-bold text-gray-500">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* --------------------------------
          Filters
      -------------------------------- */}

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email or ID..."
            className="min-w-0 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-w-0 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Staff">Staff</option>
            <option value="Part-time">Part-time</option>
            <option value="External">External</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-0 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* --------------------------------
          Table
      -------------------------------- */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold text-gray-600">
                  Sales Person
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold text-gray-600">
                  Contact
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold text-gray-600">
                  Type
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold text-gray-600">
                  Commission
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold text-gray-600">
                  Status
                </th>

                <th className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedSalesPersons.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    <div className="text-2xl">👥</div>

                    <p className="mt-2 font-medium text-gray-700">
                      No sales persons found.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSalesPersons.map((person) => (
                  <tr key={person.id} className="transition hover:bg-gray-50">
                    {/* Sales Person */}

                    <td className="max-w-[220px] px-5 py-4">
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-gray-900"
                          title={person.name}
                        >
                          {person.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {person.id}
                        </p>
                      </div>
                    </td>

                    {/* Contact */}

                    <td className="max-w-[260px] px-5 py-4">
                      <div className="min-w-0 space-y-0.5">
                        <p
                          className="truncate text-gray-700"
                          title={person.mobile || ""}
                        >
                          {person.mobile || "—"}
                        </p>

                        <p
                          className="truncate text-xs text-gray-500"
                          title={person.email || ""}
                        >
                          {person.email || "—"}
                        </p>
                      </div>
                    </td>

                    {/* Type */}

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {person.type}
                      </span>
                    </td>

                    {/* Commission */}

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-semibold text-gray-900">
                        {person.commissionPercent}%
                      </span>
                    </td>

                    {/* Status */}

                    <td className="whitespace-nowrap px-5 py-4">
                      {person.status === "Active" ? (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/sales-persons/${person.id}/edit`)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(person)}
                          className={
                            person.status === "Active"
                              ? "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              : "rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50"
                          }
                        >
                          {person.status === "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --------------------------------
            Pagination
        -------------------------------- */}

        {filteredSalesPersons.length > 0 && (
          <div className="border-t border-gray-100">
            <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredSalesPersons.length,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {filteredSalesPersons.length}
                </span>{" "}
                sales persons
              </p>

              {totalPages > 1 && (
                <div className="flex max-w-full flex-wrap items-center justify-start gap-1 md:justify-end">
                  {/* Previous */}

                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}

                  {pageNumbers.map((page, index) => {
                    const previousPage = pageNumbers[index - 1];

                    const showEllipsis =
                      index > 0 &&
                      previousPage !== undefined &&
                      page - previousPage > 1;

                    return (
                      <span
                        key={page}
                        className="inline-flex items-center gap-1"
                      >
                        {showEllipsis && (
                          <span className="px-1 text-xs text-gray-400">
                            ...
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[32px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}

                  {/* Next */}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
