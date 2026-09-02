import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getClients, restoreClient, type Client } from "../data/clientStore";

import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

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
    } catch {
      window.alert("Unable to restore client.");
    }
  };

  /* =================================================
     SEARCH
  ================================================= */

  const filteredClients = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return clients;
    }

    return clients.filter((client) => {
      return (
        client.company.toLowerCase().includes(searchText) ||
        client.contactPerson.toLowerCase().includes(searchText) ||
        client.phone.toLowerCase().includes(searchText) ||
        client.id.toLowerCase().includes(searchText) ||
        client.services.toLowerCase().includes(searchText)
      );
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
    <div className="space-y-4">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Archived Clients
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View and restore archived CRM clients
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Back to Clients
        </button>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived clients..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {paginatedClients.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
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
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Archived
                        </span>
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            className="text-sm font-medium text-slate-700 hover:text-slate-900"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestore(client)}
                            className="text-sm font-medium text-green-600 hover:text-green-700"
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

            {/* Pagination */}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredClients.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          /* =================================================
             EMPTY STATE
          ================================================= */

          <div className="px-5 py-12 text-center">
            <div className="text-3xl">📁</div>

            <p className="mt-3 text-sm font-medium text-slate-700">
              No archived clients
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Archived clients will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
