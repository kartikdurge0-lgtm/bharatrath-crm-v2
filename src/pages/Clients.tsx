import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getActiveClientsFromSupabase, type Client } from "../data/clientStore";
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
  const match = String(id || "").match(/(\d+)$/);

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

     Important:
     clientStore currently provides a synchronous
     compatibility API.

     No automatic Supabase sync is triggered here.
  ================================================= */

  const loadClients = useCallback(async () => {
    try {
      const activeClients = await getActiveClientsFromSupabase();
      setClients(activeClients);
    } catch (error) {
      console.error("Failed to load clients:", error);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  /* =================================================
     REFRESH WHEN PAGE BECOMES VISIBLE

     Useful when a client is added/edited in another
     CRM page and the user comes back here.
  ================================================= */

  useEffect(() => {
    const handleFocus = () => {
      void loadClients();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadClients();
      }
    };

    window.addEventListener("focus", handleFocus);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadClients]);

  /* =================================================
     FILTER + SORT

     Order:
     1. Active clients
     2. Search / Status filter
     3. Latest Client ID first
     4. Pagination
  ================================================= */

  const filteredClients = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return clients
      .filter((client) => {
        const company = client.company?.toLowerCase() || "";

        const contactPerson = client.contactPerson?.toLowerCase() || "";

        const phone = client.phone?.toLowerCase() || "";

        const email = client.email?.toLowerCase() || "";

        const id = client.id?.toLowerCase() || "";

        const services = client.services?.toLowerCase() || "";

        const gst = client.gst?.toLowerCase() || "";

        const status = client.status?.toLowerCase() || "";

        const matchesSearch =
          searchText === "" ||
          company.includes(searchText) ||
          contactPerson.includes(searchText) ||
          phone.includes(searchText) ||
          email.includes(searchText) ||
          id.includes(searchText) ||
          services.includes(searchText) ||
          gst.includes(searchText);

        const matchesStatus =
          statusFilter === "all" || status === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        /*
         * Latest Client ID first.
         *
         * CL-008 → CL-007 → CL-006
         */

        const sequenceDifference =
          getClientSequence(b.id) - getClientSequence(a.id);

        if (sequenceDifference !== 0) {
          return sequenceDifference;
        }

        /*
         * Stable secondary sorting.
         */
        return b.id.localeCompare(a.id, undefined, {
          numeric: true,
          sensitivity: "base",
        });
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
     STATUS STYLE
  ================================================= */

  const getStatusClass = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === "active") {
      return "bg-green-50 text-green-700";
    }

    if (normalized === "pending") {
      return "bg-yellow-50 text-yellow-700";
    }

    if (normalized === "inactive") {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-slate-100 text-slate-600";
  };

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              autoComplete="off"
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
              onChange={(event) => setStatusFilter(event.target.value)}
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
          RESULTS SUMMARY
      ================================================= */}

      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-slate-500 sm:text-sm">
          Showing{" "}
          <span className="font-medium text-slate-700">
            {filteredClients.length}
          </span>{" "}
          {filteredClients.length === 1 ? "client" : "clients"}
        </p>

        {search || statusFilter !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="shrink-0 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 sm:text-sm"
          >
            Clear filters
          </button>
        ) : null}
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
                          {client.services || "—"}
                        </p>
                      </td>

                      {/* Status */}

                      <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            client.status,
                          )}`}
                        >
                          {client.status || "Unknown"}
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

          <div className="px-4 py-12 text-center sm:px-5">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl"
              aria-hidden="true"
            >
              👥
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700">
              No clients found
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {search || statusFilter !== "all"
                ? "Try changing your search or status filter."
                : "Add your first client to get started."}
            </p>

            {!search && statusFilter === "all" ? (
              <button
                type="button"
                onClick={() => navigate("/add-client")}
                className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                + Add Client
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
