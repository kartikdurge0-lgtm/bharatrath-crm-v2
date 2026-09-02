import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, type Client } from "../data/clientStore";

import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

export default function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  /* =================================================
     LOAD CLIENTS
  ================================================= */

  const loadClients = () => {
    const allClients = getClients();

    const activeClients = allClients.filter((client) => !client.archived);

    setClients(activeClients);
  };

  useEffect(() => {
    loadClients();
  }, []);

  /* =================================================
     FILTER
  ================================================= */

  const filteredClients = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return clients.filter((client) => {
      const matchesSearch =
        client.company.toLowerCase().includes(searchText) ||
        client.contactPerson.toLowerCase().includes(searchText) ||
        client.phone.toLowerCase().includes(searchText) ||
        client.id.toLowerCase().includes(searchText) ||
        client.services.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        client.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  /* =================================================
     RESET PAGE WHEN FILTER CHANGES
  ================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* =================================================
     PAGINATION
  ================================================= */

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredClients.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="space-y-4">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clients</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage all Bharatrath CRM clients
          </p>
        </div>

        {/* =================================================
            HEADER ACTIONS
        ================================================= */}

        <div className="flex items-center gap-2">
          {/* Archived Clients */}

          <button
            type="button"
            onClick={() => navigate("/archived-clients")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span>📁</span>
            <span>Archived Clients</span>
          </button>

          {/* Add Client */}

          <button
            type="button"
            onClick={() => navigate("/add-client")}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* =================================================
          SEARCH & FILTER
      ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          {/* Search */}

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
          />

          {/* Status */}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* =================================================
          CLIENTS TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {paginatedClients.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                {/* Table Header */}

                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Services
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}

                <tbody className="divide-y divide-slate-100">
                  {paginatedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50">
                      {/* Client */}

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {client.company}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {client.id}
                        </p>
                      </td>

                      {/* Contact */}

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {client.contactPerson}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {client.phone}
                        </p>
                      </td>

                      {/* Services */}

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {client.services}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            client.status === "Active"
                              ? "bg-green-50 text-green-700"
                              : client.status === "Pending"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      {/* Action */}

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="text-sm font-medium text-slate-900 hover:text-slate-600"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredClients.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          /* No Results */

          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No clients found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
