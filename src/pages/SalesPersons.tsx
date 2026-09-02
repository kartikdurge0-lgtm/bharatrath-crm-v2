import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  activateSalesPerson,
  deactivateSalesPerson,
  getSalesPersons,
  type SalesPerson,
} from "../data/salesPersonStore";

export default function SalesPersons() {
  const navigate = useNavigate();

  const [salesPersons, setSalesPersons] =
    useState<SalesPerson[]>(getSalesPersons());

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const refresh = () => {
    setSalesPersons(getSalesPersons());
  };

  const filteredSalesPersons = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return salesPersons.filter((person) => {
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
    });
  }, [salesPersons, search, typeFilter, statusFilter]);

  const activeCount = salesPersons.filter(
    (person) => person.status === "Active",
  ).length;

  const inactiveCount = salesPersons.filter(
    (person) => person.status === "Inactive",
  ).length;

  const handleToggleStatus = (person: SalesPerson) => {
    if (person.status === "Active") {
      deactivateSalesPerson(person.id);
    } else {
      activateSalesPerson(person.id);
    }

    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Persons</h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage sales persons and their commission settings
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-sales-person")}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Sales Person
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Sales Persons</p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {salesPersons.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Inactive</p>

          <p className="mt-2 text-2xl font-bold text-gray-500">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email or ID..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Staff">Staff</option>
            <option value="Part-time">Part-time</option>
            <option value="External">External</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">
                  Sales Person
                </th>

                <th className="px-5 py-3 text-left font-semibold text-gray-600">
                  Contact
                </th>

                <th className="px-5 py-3 text-left font-semibold text-gray-600">
                  Type
                </th>

                <th className="px-5 py-3 text-left font-semibold text-gray-600">
                  Commission
                </th>

                <th className="px-5 py-3 text-left font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-5 py-3 text-right font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredSalesPersons.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No sales persons found.
                  </td>
                </tr>
              ) : (
                filteredSalesPersons.map((person) => (
                  <tr key={person.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {person.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {person.id}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <p className="text-gray-700">{person.mobile || "—"}</p>

                        <p className="text-xs text-gray-500">
                          {person.email || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {person.type}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">
                        {person.commissionPercent}%
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {person.status === "Active" ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/sales-persons/${person.id}/edit`)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(person)}
                          className={
                            person.status === "Active"
                              ? "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              : "rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50"
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

        <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          Showing {filteredSalesPersons.length} of {salesPersons.length} sales
          persons
        </div>
      </div>
    </div>
  );
}
