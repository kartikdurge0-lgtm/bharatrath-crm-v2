import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, restoreClient, type Client } from "../data/clientStore";

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

export default function ArchivedClients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* =================================================
     LOAD ARCHIVED CLIENTS
  ================================================= */

  const loadArchivedClients = () => {
    const allClients = getClients();

    const archivedClients = allClients.filter(
      (client) => client.archived === true,
    );

    setClients(archivedClients);
  };

  useEffect(() => {
    loadArchivedClients();
  }, []);

  /* =================================================
     RESTORE CLIENT
  ================================================= */

  const handleRestore = (client: Client) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${client.company}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      restoreClient(client.id);

      loadArchivedClients();
      setCurrentPage(1);
    } catch (error) {
      console.error("Unable to restore client:", error);

      window.alert("Unable to restore client.");
    }
  };

  /* =================================================
     SEARCH + SORT

     Order:
     1. Archived clients
     2. Search
     3. Latest Client ID first
     4. Pagination
  ================================================= */

  const filteredClients = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return clients
      .filter((client) => {
        if (!searchText) {
          return true;
        }

        const company = client.company?.toLowerCase() || "";
        const contactPerson = client.contactPerson?.toLowerCase() || "";
        const phone = client.phone?.toLowerCase() || "";
        const id = client.id?.toLowerCase() || "";
        const services = client.services?.toLowerCase() || "";

        return (
          company.includes(searchText) ||
          contactPerson.includes(searchText) ||
          phone.includes(searchText) ||
          id.includes(searchText) ||
          services.includes(searchText)
        );
      })
      .sort((a, b) => {
        /*
         * Latest Client ID first.
         *
         * CL-008 → CL-007 → CL-006
         */

        return getClientSequence(b.id) - getClientSequence(a.id);
      });
  }, [clients, search]);

  /* =================================================
     RESET PAGE WHEN SEARCH CHANGES
  ================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
            Archived Clients
          </h2>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            View and restore archived CRM clients
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
        >
          ← Back to Clients
        </button>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <label htmlFor="archived-client-search" className="sr-only">
          Search archived clients
        </label>

        <input
          id="archived-client-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived clients..."
          className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:h-11 sm:px-4"
        />
      </div>

      {/* =================================================
          TABLE
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

                    <th className="w-[13%] min-w-[150px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
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
                        <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Archived
                        </span>
                      </td>

                      {/* Actions */}

                      <td className="px-4 py-3.5 text-right sm:px-5 sm:py-4">
                        <div className="flex items-center justify-end gap-2 sm:gap-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            className="inline-flex min-h-8 items-center justify-center rounded-md px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestore(client)}
                            className="inline-flex min-h-8 items-center justify-center rounded-md px-2 text-sm font-medium text-green-600 transition hover:bg-green-50 hover:text-green-700"
                          >
                            Restore
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
             EMPTY STATE
          ================================================= */

          <div className="px-4 py-12 text-center sm:px-5">
            <div className="text-3xl">📁</div>

            <p className="mt-3 text-sm font-medium text-slate-700">
              No archived clients
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Archived clients will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
