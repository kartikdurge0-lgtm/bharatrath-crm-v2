import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getLeads,
  updateLeadStatus,
  type Lead,
  type LeadPriority,
  type LeadStatus,
} from "../data/leadStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";
import { getClientById } from "../data/clientStore";

import Pagination from "../components/Pagination";
import BulkLeadUpload from "../components/BulkLeadUpload";

const PAGE_SIZE = 6;

export default function Leads() {
  const navigate = useNavigate();

  /* =================================================
     LEADS
  ================================================= */

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  /* =================================================
     FILTERS
  ================================================= */

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [priorityFilter, setPriorityFilter] = useState("All");

  const [sourceFilter, setSourceFilter] = useState("All");

  const [salesPersonFilter, setSalesPersonFilter] = useState("All");

  /* =================================================
     PAGINATION
  ================================================= */

  const [currentPage, setCurrentPage] = useState(1);

  /* =================================================
     BULK UPLOAD
  ================================================= */

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  /* =================================================
     SALES PERSONS
  ================================================= */

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  /* =================================================
     LOAD LEADS
  ================================================= */

  const refresh = async () => {
    try {
      setLoading(true);

      const data = await getLeads();

      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads:", error);

      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  /* =================================================
     LOAD SALES PERSONS
  ================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadSalesPersons() {
      try {
        const persons = await getActiveSalesPersons();

        if (!mounted) {
          return;
        }

        setSalesPersons(persons);
      } catch (error) {
        console.error("Failed to load sales persons:", error);

        if (mounted) {
          setSalesPersons([]);
        }
      }
    }

    void loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  /* =================================================
     FILTERED LEADS
  ================================================= */

  const filteredLeads = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return leads
      .filter((lead) => {
        const matchesSearch =
          !searchText ||
          lead.id.toLowerCase().includes(searchText) ||
          lead.companyName.toLowerCase().includes(searchText) ||
          lead.contactPerson.toLowerCase().includes(searchText) ||
          lead.phone.toLowerCase().includes(searchText) ||
          lead.email.toLowerCase().includes(searchText) ||
          lead.convertedClientId?.toLowerCase().includes(searchText);

        const matchesStatus =
          statusFilter === "All" || lead.status === statusFilter;

        const matchesPriority =
          priorityFilter === "All" || lead.priority === priorityFilter;

        const matchesSource =
          sourceFilter === "All" || lead.leadSource === sourceFilter;

        const matchesSalesPerson =
          salesPersonFilter === "All" || lead.assignedTo === salesPersonFilter;

        return (
          Boolean(matchesSearch) &&
          matchesStatus &&
          matchesPriority &&
          matchesSource &&
          matchesSalesPerson
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();

        return dateB - dateA;
      });
  }, [
    leads,
    search,
    statusFilter,
    priorityFilter,
    sourceFilter,
    salesPersonFilter,
  ]);

  /* =================================================
     RESET PAGE WHEN FILTER CHANGES
  ================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, sourceFilter, salesPersonFilter]);

  /* =================================================
     PAGINATION
  ================================================= */

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredLeads.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  /* =================================================
     SUMMARY
  ================================================= */

  const totalLeads = leads.length;

  const newLeads = leads.filter((lead) => lead.status === "New").length;

  const followUpLeads = leads.filter(
    (lead) => lead.status === "Follow-up",
  ).length;

  /*
   * Pipeline should only include open opportunities.
   * Won and Lost are excluded.
   */

  const pipelineValue = filteredLeads
    .filter(
      (lead) =>
        lead.status === "New" ||
        lead.status === "Contacted" ||
        lead.status === "Follow-up" ||
        lead.status === "Quotation Sent" ||
        lead.status === "Negotiation",
    )
    .reduce((total, lead) => total + Number(lead.expectedValue || 0), 0);

  /* =================================================
     CURRENCY
  ================================================= */

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  /* =================================================
     STATUS CLASS
  ================================================= */

  const getStatusClass = (status: LeadStatus) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700";

      case "Contacted":
        return "bg-slate-100 text-slate-700";

      case "Follow-up":
        return "bg-orange-50 text-orange-700";

      case "Quotation Sent":
        return "bg-indigo-50 text-indigo-700";

      case "Negotiation":
        return "bg-amber-50 text-amber-700";

      case "Won":
        return "bg-green-50 text-green-700";

      case "Lost":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  /* =================================================
     PRIORITY CLASS
  ================================================= */

  const getPriorityClass = (priority: LeadPriority) => {
    switch (priority) {
      case "High":
        return "bg-red-50 text-red-700";

      case "Medium":
        return "bg-orange-50 text-orange-700";

      case "Low":
        return "bg-slate-100 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  /* =================================================
     SALES PERSON NAME
  ================================================= */

  const getSalesPersonName = (lead: Lead) => {
    const person = salesPersons.find(
      (salesPerson) => salesPerson.id === lead.assignedTo,
    );

    return person?.name || lead.assignedTo || "—";
  };

  /* =================================================
     CONVERTED CLIENT
  ================================================= */

  const getConvertedClient = (lead: Lead) => {
    if (!lead.convertedClientId) {
      return undefined;
    }

    return getClientById(lead.convertedClientId);
  };

  /* =================================================
     STATUS CHANGE
  ================================================= */

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    /*
     * Converted lead must remain Won.
     */

    if (lead.convertedClientId) {
      alert(
        "This lead has already been converted to a client. Its status remains Won.",
      );

      return;
    }

    try {
      await updateLeadStatus(lead.id, status);

      await refresh();
    } catch (error) {
      console.error("Failed to update lead status:", error);

      alert("Failed to update lead status. Please try again.");
    }
  };

  /* =================================================
     RESET FILTERS
  ================================================= */

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setSourceFilter("All");
    setSalesPersonFilter("All");
    setCurrentPage(1);
  };

  /* =================================================
     LOADING
  ================================================= */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leads</h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage leads, sales pipeline and follow-ups
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">Loading leads...</p>
        </div>
      </div>
    );
  }

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="space-y-4">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-slate-900">
            Leads
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage leads, sales pipeline and follow-ups
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/add-lead")}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            + Add Lead
          </button>

          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
          >
            ↑ Upload Leads
          </button>
        </div>
      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-slate-400 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Leads</p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {totalLeads}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-base">
              🎯
            </div>
          </div>
        </div>

        {/* NEW */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">New Leads</p>

              <p className="mt-1 text-2xl font-bold text-blue-600">
                {newLeads}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-base">
              ✨
            </div>
          </div>
        </div>

        {/* FOLLOW-UP */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Follow-ups</p>

              <p className="mt-1 text-2xl font-bold text-orange-600">
                {followUpLeads}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-base">
              📞
            </div>
          </div>
        </div>

        {/* PIPELINE */}

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-green-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Pipeline Value
              </p>

              <p className="mt-1 text-xl font-bold text-green-600">
                {formatCurrency(pipelineValue)}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-base">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/* SEARCH */}

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads..."
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Status</option>

            <option value="New">New</option>

            <option value="Contacted">Contacted</option>

            <option value="Follow-up">Follow-up</option>

            <option value="Quotation Sent">Quotation Sent</option>

            <option value="Negotiation">Negotiation</option>

            <option value="Won">Won</option>

            <option value="Lost">Lost</option>
          </select>

          {/* PRIORITY */}

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Priority</option>

            <option value="High">High</option>

            <option value="Medium">Medium</option>

            <option value="Low">Low</option>
          </select>

          {/* SOURCE */}

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Sources</option>

            {Array.from(
              new Set(leads.map((lead) => lead.leadSource).filter(Boolean)),
            ).map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          {/* SALES PERSON */}

          <select
            value={salesPersonFilter}
            onChange={(event) => setSalesPersonFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Sales Persons</option>

            {salesPersons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        {/* FILTER FOOTER */}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {filteredLeads.length} lead
            {filteredLeads.length === 1 ? "" : "s"}
          </p>

          <button
            type="button"
            onClick={handleResetFilters}
            className="w-fit text-sm font-medium text-green-600 hover:text-green-800"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* =================================================
          LEADS TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Lead</th>

                <th className="px-4 py-3">Contact</th>

                <th className="px-4 py-3">Source</th>

                <th className="px-4 py-3">Sales Person</th>

                <th className="px-4 py-3">Value</th>

                <th className="px-4 py-3">Priority</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-3xl">🎯</div>

                      <h3 className="mt-3 text-sm font-semibold text-slate-900">
                        No Leads Found
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Try changing the filters or add a new lead.
                      </p>

                      <button
                        type="button"
                        onClick={() => navigate("/add-lead")}
                        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        + Add Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const convertedClient = getConvertedClient(lead);

                  const isConverted = Boolean(lead.convertedClientId);

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      {/* LEAD */}

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="text-left"
                        >
                          <div className="font-semibold text-slate-900 hover:text-green-700">
                            {lead.companyName ||
                              lead.contactPerson ||
                              "Unnamed Lead"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {lead.id}
                          </div>
                        </button>

                        {isConverted && (
                          <div className="mt-2 inline-flex rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                            ✓ Client {lead.convertedClientId}
                          </div>
                        )}
                      </td>

                      {/* CONTACT */}

                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-700">
                          {lead.contactPerson || "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {lead.phone || "—"}
                        </div>

                        {lead.email && (
                          <div className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                            {lead.email}
                          </div>
                        )}
                      </td>

                      {/* SOURCE */}

                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">
                          {lead.leadSource || "—"}
                        </div>

                        {lead.sourceDetails && (
                          <div className="mt-1 max-w-[160px] truncate text-xs text-slate-400">
                            {lead.sourceDetails}
                          </div>
                        )}
                      </td>

                      {/* SALES PERSON */}

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {getSalesPersonName(lead)}
                      </td>

                      {/* VALUE */}

                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        {formatCurrency(Number(lead.expectedValue || 0))}
                      </td>

                      {/* PRIORITY */}

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                            lead.priority,
                          )}`}
                        >
                          {lead.priority}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">
                        <select
                          value={lead.status}
                          disabled={isConverted}
                          onChange={(event) =>
                            void handleStatusChange(
                              lead,
                              event.target.value as LeadStatus,
                            )
                          }
                          className={`rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold outline-none ${getStatusClass(
                            lead.status,
                          )} ${
                            isConverted
                              ? "cursor-not-allowed opacity-70"
                              : "cursor-pointer"
                          }`}
                        >
                          <option value="New">New</option>

                          <option value="Contacted">Contacted</option>

                          <option value="Follow-up">Follow-up</option>

                          <option value="Quotation Sent">Quotation Sent</option>

                          <option value="Negotiation">Negotiation</option>

                          <option value="Won">Won</option>

                          <option value="Lost">Lost</option>
                        </select>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </button>

                          {convertedClient ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/clients/${convertedClient.id}`)
                              }
                              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
                            >
                              Client
                            </button>
                          ) : lead.status === "Won" ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/add-client?leadId=${encodeURIComponent(
                                    lead.id,
                                  )}`,
                                )
                              }
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
                            >
                              Convert
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/leads/${lead.id}/edit`)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
            PAGINATION
        ================================================= */}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredLeads.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* =================================================
          BULK UPLOAD
      ================================================= */}

      {showBulkUpload && (
        <BulkLeadUpload
          onClose={() => setShowBulkUpload(false)}
          onImported={async () => {
            await refresh();
            setShowBulkUpload(false);
          }}
        />
      )}
    </div>
  );
}
