import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, type Client } from "../data/clientStore";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

/* =================================================
   CLIENT ID SORT
   Latest Client ID first
   Example:
   CL-008
   CL-007
   CL-006
   ...
================================================= */

function getClientSequence(id: string): number {
  const match = id.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : 0;
}

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
     FILTER + SORT

     Order:
     1. Active clients
     2. Search / Status filter
     3. Latest client first
     4. Pagination
  ================================================= */

  const filteredClients = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return clients
      .filter((client) => {
        const company = client.company?.toLowerCase() || "";
        const contactPerson = client.contactPerson?.toLowerCase() || "";
        const phone = client.phone?.toLowerCase() || "";
        const id = client.id?.toLowerCase() || "";
        const services = client.services?.toLowerCase() || "";
        const status = client.status?.toLowerCase() || "";

        const matchesSearch =
          company.includes(searchText) ||
          contactPerson.includes(searchText) ||
          phone.includes(searchText) ||
          id.includes(searchText) ||
          services.includes(searchText);

        const matchesStatus =
          statusFilter === "all" || status === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        /*
         * Latest Client ID first.
         *
         * CL-008 → CL-007 → CL-006 ...
         */

        return getClientSequence(b.id) - getClientSequence(a.id);
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
    <div className="mx-auto w-full max-w-[1800px] min-w-0 space-y-4 sm:space-y-5">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
            Clients
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage all Bharatrath CRM clients
          </p>
        </div>

        {/* =================================================
            HEADER ACTIONS
        ================================================= */}

        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
          {/* Archived Clients */}

          <button
            type="button"
            onClick={() => navigate("/archived-clients")}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:px-4"
          >
            <span>📁</span>

            <span>Archived Clients</span>
          </button>

          {/* Add Client */}

          <button
            type="button"
            onClick={() => navigate("/add-client")}
            className="min-h-10 rounded-lg bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* =================================================
          SEARCH & FILTER
      ================================================= */}

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          {/* Search */}

          <div className="min-w-0">
            <label htmlFor="client-search" className="sr-only">
              Search clients
            </label>

            <input
              id="client-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:h-11 sm:px-4"
            />
          </div>

          {/* Status */}

          <div className="min-w-0">
            <label htmlFor="client-status-filter" className="sr-only">
              Filter by status
            </label>

            <select
              id="client-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:h-11 sm:px-4"
            >
              <option value="all">All Status</option>

              <option value="active">Active</option>

              <option value="pending">Pending</option>

              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* =================================================
          CLIENTS TABLE
      ================================================= */}

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {paginatedClients.length > 0 ? (
          <>
            {/* 
              Horizontal scrolling is intentionally limited
              to the table area on smaller screens.
            */}

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px]">
                {/* =================================================
                    TABLE HEADER
                ================================================= */}

                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="w-[27%] min-w-[190px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Client
                    </th>

                    <th className="w-[22%] min-w-[160px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Contact
                    </th>

                    <th className="w-[25%] min-w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Services
                    </th>

                    <th className="w-[13%] min-w-[100px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Status
                    </th>

                    <th className="w-[13%] min-w-[90px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Action
                    </th>
                  </tr>
                </thead>

                {/* =================================================
                    TABLE BODY
                ================================================= */}

                <tbody className="divide-y divide-slate-100">
                  {paginatedClients.map((client) => (
                    <tr
                      key={client.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* Client */}

                      <td className="max-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-slate-900"
                            title={client.company}
                          >
                            {client.company}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {client.id}
                          </p>
                        </div>
                      </td>

                      {/* Contact */}

                      <td className="max-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm text-slate-700"
                            title={client.contactPerson}
                          >
                            {client.contactPerson}
                          </p>

                          <p
                            className="mt-1 truncate text-xs text-slate-500"
                            title={client.phone}
                          >
                            {client.phone}
                          </p>
                        </div>
                      </td>

                      {/* Services */}

                      <td className="max-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
                        <p
                          className="truncate text-sm text-slate-700"
                          title={client.services}
                        >
                          {client.services}
                        </p>
                      </td>

                      {/* Status */}

                      <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
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

                      <td className="px-4 py-3.5 text-right sm:px-5 sm:py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="inline-flex min-h-8 items-center justify-center rounded-md px-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredClients.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        ) : (
          /* =================================================
             NO RESULTS
          ================================================= */

          <div className="px-4 py-10 text-center sm:px-5">
            <p className="text-sm font-medium text-slate-700">
              No clients found
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Try changing your search or status filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
