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

  const [leads, setLeads] = useState<Lead[]>(getLeads());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  useEffect(() => {
    let mounted = true;

    async function loadSalesPersons() {
      try {
        const persons = await getActiveSalesPersons();

        if (!mounted) return;

        setSalesPersons(persons);
      } catch (error) {
        console.error("Failed to load sales persons:", error);

        if (mounted) {
          setSalesPersons([]);
        }
      }
    }

    loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  const refresh = () => {
    setLeads(getLeads());
  };

  /* =================================================
     FILTERED LEADS
  ================================================= */

  const filteredLeads = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !searchText ||
        lead.id.toLowerCase().includes(searchText) ||
        lead.companyName.toLowerCase().includes(searchText) ||
        lead.contactPerson.toLowerCase().includes(searchText) ||
        lead.phone.toLowerCase().includes(searchText) ||
        lead.email.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || lead.priority === priorityFilter;

      const matchesSource =
        sourceFilter === "All" || lead.leadSource === sourceFilter;

      const matchesSalesPerson =
        salesPersonFilter === "All" || lead.assignedTo === salesPersonFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesSource &&
        matchesSalesPerson
      );
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
     PAGINATION
  ================================================= */

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, sourceFilter, salesPersonFilter]);

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

  const totalValue = filteredLeads.reduce(
    (total, lead) => total + Number(lead.expectedValue || 0),
    0,
  );

  /* =================================================
     STATUS COLORS
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
        return "bg-blue-50 text-blue-700";

      case "Negotiation":
        return "bg-orange-50 text-orange-700";

      case "Won":
        return "bg-green-50 text-green-700";

      case "Lost":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  /* =================================================
     PRIORITY COLORS
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
     STATUS CHANGE
  ================================================= */

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLeadStatus(id, status);
    refresh();
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
     SALES PERSON
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

  return (
    <div className="space-y-4">
      {/* PAGE HEADER */}
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

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 border-l-4 border-l-slate-400 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Leads</p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {leads.length}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-base">
              🎯
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">New Leads</p>

              <p className="mt-1 text-2xl font-bold text-blue-600">
                {leads.filter((lead) => lead.status === "New").length}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-base">
              ✨
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Follow-ups</p>

              <p className="mt-1 text-2xl font-bold text-orange-600">
                {leads.filter((lead) => lead.status === "Follow-up").length}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-base">
              📞
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-green-500 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Pipeline Value
              </p>

              <p className="mt-1 text-xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-base">
              ₹
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
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

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Sources</option>
            <option value="Website">Website</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Referral">Referral</option>
            <option value="Event">Event</option>
            <option value="Existing Client">Existing Client</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={salesPersonFilter}
            onChange={(e) => setSalesPersonFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="All">All Sales Persons</option>

            {salesPersons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {filteredLeads.length} lead
            {filteredLeads.length === 1 ? "" : "s"}
          </p>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-medium text-slate-500 transition hover:text-green-700"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1150px] w-full text-sm">
            <thead className="border-b border-slate-200 bg-[#F4F7FA]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lead
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sales Person
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Value
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Follow-up
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
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
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No leads found.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const convertedClient = getConvertedClient(lead);

                  return (
                    <tr
                      key={lead.id}
                      className="transition hover:bg-green-50/30"
                    >
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {lead.companyName || lead.contactPerson}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {lead.id}
                          </p>

                          {lead.companyName && lead.contactPerson && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {lead.contactPerson}
                            </p>
                          )}

                          {convertedClient && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/clients/${convertedClient.id}`)
                              }
                              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 transition hover:bg-green-100"
                            >
                              ✓ Client {convertedClient.id}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-slate-700">{lead.phone || "—"}</p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {lead.email || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {lead.leadSource}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-slate-700">
                          {getSalesPersonName(lead)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-900">
                          {formatCurrency(Number(lead.expectedValue || 0))}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {lead.nextFollowUpDate ? (
                          <div>
                            <p className="text-slate-700">
                              {lead.nextFollowUpDate}
                            </p>

                            {lead.nextFollowUpTime && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {lead.nextFollowUpTime}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                            lead.priority,
                          )}`}
                        >
                          {lead.priority}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(
                              lead.id,
                              e.target.value as LeadStatus,
                            )
                          }
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${getStatusClass(
                            lead.status,
                          )}`}
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

                      <td className="px-5 py-3.5">
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
                                navigate(`/add-client?leadId=${lead.id}`)
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

        <Pagination
          currentPage={currentPage}
          totalItems={filteredLeads.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* BULK LEAD UPLOAD */}
      {showBulkUpload && (
        <BulkLeadUpload
          onClose={() => setShowBulkUpload(false)}
          onImported={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
