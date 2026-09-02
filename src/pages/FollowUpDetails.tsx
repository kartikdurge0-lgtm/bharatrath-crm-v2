import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getFollowUp,
  completeFollowUp,
  reopenFollowUp,
  deleteFollowUp,
} from "../data/followUpStore";

import type { FollowUpPriority } from "../data/followUpStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";

function formatDate(date: string): string {
  if (!date) return "-";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatTime(time: string): string {
  if (!time) return "-";

  const [hours, minutes] = time.split(":");

  const hour = Number(hours);

  if (!Number.isFinite(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function isOverdue(followUp: {
  status: string;
  followUpDate: string;
}): boolean {
  if (followUp.status !== "Pending") {
    return false;
  }

  if (!followUp.followUpDate) {
    return false;
  }

  const today = new Date().toISOString().split("T")[0];

  return followUp.followUpDate < today;
}

function priorityClass(priority: FollowUpPriority): string {
  if (priority === "High") {
    return "bg-red-50 text-red-700";
  }

  if (priority === "Medium") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-slate-100 text-slate-700";
}

function relatedTypeClass(type?: string): string {
  if (type === "Lead") {
    return "bg-purple-50 text-purple-700";
  }

  if (type === "Client") {
    return "bg-green-50 text-green-700";
  }

  if (type === "Quotation") {
    return "bg-blue-50 text-blue-700";
  }

  if (type === "Renewal") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-700";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default function FollowUpDetails() {
  const navigate = useNavigate();
  const { followUpId } = useParams();

  const [refresh, setRefresh] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Force component refresh after Complete/Reopen.
  void refresh;

  const followUp = followUpId ? getFollowUp(followUpId) : null;

  const salesPersons = getActiveSalesPersons();

  /*
   * Follow-up Assigned To should be an
   * internal Bharatrath team member.
   *
   * External sales persons are NOT included here.
   */
  const internalTeam = salesPersons.filter(
    (person) => person.type === "Staff" || person.type === "Part-time",
  );

  if (!followUp) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/follow-ups")}
          className="mb-5 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Follow-ups
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">📞</div>

          <h2 className="text-xl font-semibold text-slate-900">
            Follow-up not found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            This follow-up may have been deleted or the ID may be incorrect.
          </p>
        </div>
      </div>
    );
  }

  const assignedPerson = internalTeam.find(
    (person) => person.id === followUp.assignedTo,
  );

  const relatedName = followUp.relatedName || followUp.clientName || "-";

  const overdue = isOverdue(followUp);

  const handleComplete = () => {
    completeFollowUp(followUp.id);

    setRefresh((value) => value + 1);
  };

  const handleReopen = () => {
    reopenFollowUp(followUp.id);

    setRefresh((value) => value + 1);
  };

  const handleDelete = () => {
    deleteFollowUp(followUp.id);

    navigate("/follow-ups");
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-7">
        <div>
          <button
            type="button"
            onClick={() => navigate("/follow-ups")}
            className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Follow-ups
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm text-slate-500">{followUp.id}</span>

            {followUp.relatedType && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${relatedTypeClass(
                  followUp.relatedType,
                )}`}
              >
                {followUp.relatedType}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900">{relatedName}</h1>

          <p className="mt-1 text-sm text-slate-500">
            {followUp.purpose || "Follow-up activity"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:pt-9">
          <button
            type="button"
            onClick={() => navigate(`/follow-ups/${followUp.id}/edit`)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>

          {followUp.status === "Pending" ? (
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              ✓ Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              className="rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Reopen
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              followUp.status === "Completed"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {followUp.status}
          </span>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${priorityClass(
              followUp.priority,
            )}`}
          >
            {followUp.priority} Priority
          </span>

          {overdue && (
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Follow-up Information */}
      <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Follow-up Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Schedule, contact and assignment details
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:grid-cols-3">
          <DetailItem
            label="Follow-up Date"
            value={formatDate(followUp.followUpDate)}
          />

          <DetailItem
            label="Follow-up Time"
            value={formatTime(followUp.followUpTime)}
          />

          <DetailItem label="Follow-up Type" value={followUp.followUpType} />

          <DetailItem label="Contact Person" value={followUp.contactPerson} />

          <DetailItem label="Mobile Number" value={followUp.phone} />

          <DetailItem
            label="Assigned To"
            value={assignedPerson?.name || followUp.assignedTo || "-"}
          />

          <DetailItem label="Reminder" value={followUp.reminder} />

          <DetailItem label="Priority" value={followUp.priority} />

          <DetailItem label="Purpose" value={followUp.purpose} />
        </div>
      </section>

      {/* Related Record */}
      <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Related Record
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The CRM record connected to this follow-up
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:grid-cols-3">
          <DetailItem label="Related To" value={followUp.relatedType || "-"} />

          <DetailItem label="Record Name" value={relatedName} />

          <DetailItem label="Record ID" value={followUp.relatedId || "-"} />

          {followUp.relatedType === "Client" && (
            <>
              <DetailItem label="Client ID" value={followUp.clientId || "-"} />

              <DetailItem
                label="Client Name"
                value={followUp.clientName || "-"}
              />
            </>
          )}
        </div>
      </section>

      {/* Next Action */}
      <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Next Action</h2>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:grid-cols-3">
          <DetailItem
            label="Next Follow-up Date"
            value={formatDate(followUp.nextFollowUpDate)}
          />

          <DetailItem
            label="Next Follow-up Time"
            value={formatTime(followUp.nextFollowUpTime)}
          />

          <DetailItem label="Next Action" value={followUp.nextAction} />
        </div>
      </section>

      {/* Notes */}
      <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Notes
            </p>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {followUp.notes || "No notes added."}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Client Response
            </p>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {followUp.clientResponse || "No client response recorded."}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Internal Notes
            </p>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {followUp.internalNotes || "No internal notes added."}
            </div>
          </div>
        </div>
      </section>

      {/* Record Information */}
      <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Record Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-7 p-6 md:grid-cols-2">
          <DetailItem
            label="Created At"
            value={
              followUp.createdAt
                ? new Date(followUp.createdAt).toLocaleString("en-IN")
                : "-"
            }
          />

          <DetailItem
            label="Completed At"
            value={
              followUp.completedAt
                ? new Date(followUp.completedAt).toLocaleString("en-IN")
                : "-"
            }
          />
        </div>
      </section>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Follow-up?
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              This follow-up will be permanently deleted. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
