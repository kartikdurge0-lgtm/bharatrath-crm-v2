import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getFollowUps,
  completeFollowUp,
  reopenFollowUp,
} from "../data/followUpStore";

import type {
  FollowUp,
  FollowUpPriority,
  FollowUpRelatedType,
  FollowUpStatus,
} from "../data/followUpStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 6;

const relatedTypes: FollowUpRelatedType[] = [
  "Lead",
  "Client",
  "Quotation",
  "Renewal",
];

const priorities: FollowUpPriority[] = ["High", "Medium", "Low"];

const statuses: FollowUpStatus[] = ["Pending", "Completed"];

/* =================================================
   DATE / TIME HELPERS
================================================= */

function formatDate(date: string): string {
  if (!date) return "—";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatTime(time: string): string {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  if (!Number.isFinite(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function isOverdue(followUp: FollowUp): boolean {
  if (followUp.status !== "Pending") {
    return false;
  }

  if (!followUp.followUpDate) {
    return false;
  }

  const today = new Date().toISOString().split("T")[0];

  return followUp.followUpDate < today;
}

function isToday(followUp: FollowUp): boolean {
  if (followUp.status !== "Pending") {
    return false;
  }

  const today = new Date().toISOString().split("T")[0];

  return followUp.followUpDate === today;
}

/* =================================================
   BADGE CLASSES
================================================= */

function priorityClass(priority: FollowUpPriority) {
  if (priority === "High") {
    return "bg-red-50 text-red-600 border border-red-100";
  }

  if (priority === "Low") {
    return "bg-slate-50 text-slate-600 border border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border border-amber-100";
}

function statusClass(status: FollowUpStatus) {
  if (status === "Completed") {
    return "bg-green-50 text-green-700 border border-green-100";
  }

  return "bg-blue-50 text-blue-600 border border-blue-100";
}

function relatedTypeClass(type?: FollowUpRelatedType) {
  if (type === "Lead") {
    return "bg-blue-50 text-blue-600 border border-blue-100";
  }

  if (type === "Client") {
    return "bg-green-50 text-green-700 border border-green-100";
  }

  if (type === "Quotation") {
    return "bg-slate-50 text-slate-700 border border-slate-200";
  }

  if (type === "Renewal") {
    return "bg-amber-50 text-amber-700 border border-amber-100";
  }

  return "bg-slate-50 text-slate-600 border border-slate-200";
}

/* =================================================
   PAGE
================================================= */

export default function FollowUps() {
  const navigate = useNavigate();

  const [followUps, setFollowUps] = useState<FollowUp[]>(() => getFollowUps());

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  const [search, setSearch] = useState("");

  const [relatedType, setRelatedType] = useState<FollowUpRelatedType | "">("");

  const [priority, setPriority] = useState<FollowUpPriority | "">("");

  const [status, setStatus] = useState<FollowUpStatus | "">("");

  const [assignedTo, setAssignedTo] = useState("");

  const [viewFilter, setViewFilter] = useState<
    "All" | "Today" | "Overdue" | "Pending" | "Completed"
  >("All");

  const [currentPage, setCurrentPage] = useState(1);

  /* =================================================
     LOAD SALES PERSONS
  ================================================= */

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

  /* =================================================
     ASSIGNED PERSON MAP
  ================================================= */

  const assignedNames = useMemo(() => {
    const map = new Map<string, string>();

    salesPersons.forEach((person) => {
      map.set(person.id, person.name);
    });

    return map;
  }, [salesPersons]);

  /* =================================================
     FILTERED FOLLOW-UPS
  ================================================= */

  const filteredFollowUps = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return [...followUps]
      .filter((followUp) => {
        if (!searchText) {
          return true;
        }

        const text = [
          followUp.id,
          followUp.relatedName,
          followUp.clientName,
          followUp.contactPerson,
          followUp.phone,
          followUp.purpose,
          followUp.nextAction,
          followUp.notes,
          followUp.internalNotes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(searchText);
      })
      .filter((followUp) => {
        if (!relatedType) return true;
        return followUp.relatedType === relatedType;
      })
      .filter((followUp) => {
        if (!priority) return true;
        return followUp.priority === priority;
      })
      .filter((followUp) => {
        if (!status) return true;
        return followUp.status === status;
      })
      .filter((followUp) => {
        if (!assignedTo) return true;
        return followUp.assignedTo === assignedTo;
      })
      .filter((followUp) => {
        if (viewFilter === "Today") {
          return isToday(followUp);
        }

        if (viewFilter === "Overdue") {
          return isOverdue(followUp);
        }

        if (viewFilter === "Pending") {
          return followUp.status === "Pending";
        }

        if (viewFilter === "Completed") {
          return followUp.status === "Completed";
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = `${a.followUpDate} ${a.followUpTime}`;
        const bDate = `${b.followUpDate} ${b.followUpTime}`;

        return aDate.localeCompare(bDate);
      });
  }, [
    followUps,
    search,
    relatedType,
    priority,
    status,
    assignedTo,
    viewFilter,
  ]);

  /* =================================================
     SUMMARY
  ================================================= */

  const total = followUps.length;

  const pending = followUps.filter(
    (followUp) => followUp.status === "Pending",
  ).length;

  const completed = followUps.filter(
    (followUp) => followUp.status === "Completed",
  ).length;

  const todayCount = followUps.filter((followUp) => isToday(followUp)).length;

  const overdueCount = followUps.filter((followUp) =>
    isOverdue(followUp),
  ).length;

  /* =================================================
     PAGINATION
  ================================================= */

  const totalPages = Math.ceil(filteredFollowUps.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, relatedType, priority, status, assignedTo, viewFilter]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedFollowUps = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredFollowUps.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredFollowUps, currentPage]);

  /* =================================================
     ACTIONS
  ================================================= */

  function handleComplete(id: string) {
    completeFollowUp(id);
    setFollowUps(getFollowUps());
  }

  function handleReopen(id: string) {
    reopenFollowUp(id);
    setFollowUps(getFollowUps());
  }

  function resetFilters() {
    setSearch("");
    setRelatedType("");
    setPriority("");
    setStatus("");
    setAssignedTo("");
    setViewFilter("All");
    setCurrentPage(1);
  }

  /* =================================================
     SUMMARY CARD CLASS
  ================================================= */

  function summaryCardClass(
    filter: "All" | "Today" | "Overdue" | "Pending" | "Completed",
    borderColor: string,
    ringColor: string,
  ) {
    const active = viewFilter === filter;

    return [
      "rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition",
      "hover:shadow-md",
      borderColor,
      active ? `ring-2 ${ringColor}` : "",
    ].join(" ");
  }

  /* =================================================
     RENDER
  ================================================= */

  return (
    <div className="mx-auto max-w-7xl">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage follow-ups across leads, clients, quotations and renewals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/add-follow-up")}
          className="shrink-0 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
        >
          + Add Follow-up
        </button>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setViewFilter("All")}
          className={summaryCardClass(
            "All",
            "border-l-[#94A3B8]",
            "ring-slate-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Total</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-sm">
              📞
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">{total}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewFilter("Today")}
          className={summaryCardClass(
            "Today",
            "border-l-[#3B82F6]",
            "ring-blue-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Today</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm">
              📅
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#3B82F6]">{todayCount}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewFilter("Overdue")}
          className={summaryCardClass(
            "Overdue",
            "border-l-[#F97316]",
            "ring-orange-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Overdue</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-sm">
              ⚠️
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#EF4444]">
            {overdueCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setViewFilter("Pending")}
          className={summaryCardClass(
            "Pending",
            "border-l-[#F59E0B]",
            "ring-amber-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Pending</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-sm">
              ⏳
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#F59E0B]">{pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setViewFilter("Completed")}
          className={summaryCardClass(
            "Completed",
            "border-l-[#16A34A]",
            "ring-green-100",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#334155]">Completed</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-sm">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#16A34A]">{completed}</p>
        </button>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search follow-ups..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          />

          <select
            value={relatedType}
            onChange={(e) =>
              setRelatedType(e.target.value as FollowUpRelatedType | "")
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="">All Related Types</option>

            {relatedTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as FollowUpPriority | "")
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="">All Priorities</option>

            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FollowUpStatus | "")}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="">All Status</option>

            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-green-100"
          >
            <option value="">All Team Members</option>

            {salesPersons
              .filter(
                (person) =>
                  person.type === "Staff" || person.type === "Part-time",
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
        </div>

        {(search ||
          relatedType ||
          priority ||
          status ||
          assignedTo ||
          viewFilter !== "All") && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-[#16A34A] hover:text-[#15803D]"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {paginatedFollowUps.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-2 text-3xl">📞</div>

            <h3 className="text-base font-semibold text-slate-900">
              No follow-ups found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a follow-up or change your filters.
            </p>

            <button
              type="button"
              onClick={() => navigate("/add-follow-up")}
              className="mt-4 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
            >
              + Add Follow-up
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F4F7FA]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Related Record
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Follow-up
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assigned To
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

                <tbody>
                  {paginatedFollowUps.map((followUp) => (
                    <tr
                      key={followUp.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-slate-900">
                          {followUp.relatedName || followUp.clientName || "—"}
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {followUp.id}
                          </span>

                          {followUp.relatedType && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${relatedTypeClass(
                                followUp.relatedType,
                              )}`}
                            >
                              {followUp.relatedType}
                            </span>
                          )}
                        </div>

                        {followUp.purpose && (
                          <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                            {followUp.purpose}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-sm text-slate-900">
                          {followUp.contactPerson || "—"}
                        </div>

                        {followUp.phone && (
                          <div className="mt-1 text-xs text-slate-500">
                            {followUp.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div
                          className={`text-sm font-semibold ${
                            isOverdue(followUp)
                              ? "text-red-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatDate(followUp.followUpDate)}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {formatTime(followUp.followUpTime)}
                        </div>

                        {isOverdue(followUp) && (
                          <span className="mt-1 inline-block rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                            Overdue
                          </span>
                        )}

                        {isToday(followUp) && (
                          <span className="mt-1 inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                            Today
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-700">
                          {assignedNames.get(followUp.assignedTo) ||
                            followUp.assignedTo ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${priorityClass(
                            followUp.priority,
                          )}`}
                        >
                          {followUp.priority}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(
                            followUp.status,
                          )}`}
                        >
                          {followUp.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/follow-ups/${followUp.id}`)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>

                          {followUp.status === "Pending" ? (
                            <button
                              type="button"
                              onClick={() => handleComplete(followUp.id)}
                              className="rounded-lg bg-[#16A34A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#15803D]"
                            >
                              Complete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReopen(followUp.id)}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-100"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredFollowUps.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
