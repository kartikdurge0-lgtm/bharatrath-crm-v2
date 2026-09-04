import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getFollowUp, updateFollowUp } from "../data/followUpStore";

import type {
  FollowUpPriority,
  FollowUpRelatedType,
} from "../data/followUpStore";

import { getLeads } from "../data/leadStore";
import { getClients } from "../data/clientStore";
import { getQuotations } from "../data/quotationStore";
import { getRenewals } from "../data/renewalStore";

import {
  getActiveSalesPersons,
  type SalesPerson,
} from "../data/salesPersonStore";

type RelatedRecord = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
};

const priorities: FollowUpPriority[] = ["High", "Medium", "Low"];

const followUpTypes = ["Call", "WhatsApp", "Meeting", "Email", "Demo", "Other"];

const reminders = [
  "No Reminder",
  "15 Minutes Before",
  "30 Minutes Before",
  "1 Hour Before",
  "1 Day Before",
];

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getRelatedRecordName(record: unknown): string {
  const item = record as Record<string, unknown>;

  return (
    getStringValue(item.companyName) ||
    getStringValue(item.company) ||
    getStringValue(item.clientName) ||
    getStringValue(item.name) ||
    getStringValue(item.title) ||
    getStringValue(item.contactPerson) ||
    getStringValue(item.id)
  );
}

function getRelatedContactPerson(record: unknown): string {
  const item = record as Record<string, unknown>;

  return getStringValue(item.contactPerson);
}

function getRelatedPhone(record: unknown): string {
  const item = record as Record<string, unknown>;

  return getStringValue(item.phone);
}

export default function EditFollowUp() {
  const navigate = useNavigate();
  const { followUpId } = useParams();

  const followUp = followUpId ? getFollowUp(followUpId) : null;

  /* =======================================================
     SALES PERSONS
  ======================================================= */

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

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

    loadSalesPersons();

    return () => {
      mounted = false;
    };
  }, []);

  const internalTeam = salesPersons.filter(
    (person) => person.type === "Staff" || person.type === "Part-time",
  );

  /* =======================================================
     RELATED DATA
  ======================================================= */

  const leads = getLeads();
  const clients = getClients();
  const quotations = getQuotations();
  const renewals = getRenewals();

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [form, setForm] = useState({
    relatedType: (followUp?.relatedType || "Lead") as FollowUpRelatedType,

    relatedId: followUp?.relatedId || "",

    contactPerson: followUp?.contactPerson || "",

    phone: followUp?.phone || "",

    purpose: followUp?.purpose || "",

    followUpType: followUp?.followUpType || "Call",

    followUpDate: followUp?.followUpDate || "",

    followUpTime: followUp?.followUpTime || "",

    priority: followUp?.priority || ("Medium" as FollowUpPriority),

    assignedTo: followUp?.assignedTo || "",

    reminder: followUp?.reminder || "No Reminder",

    nextFollowUpDate: followUp?.nextFollowUpDate || "",

    nextFollowUpTime: followUp?.nextFollowUpTime || "",

    nextAction: followUp?.nextAction || "",

    notes: followUp?.notes || "",

    clientResponse: followUp?.clientResponse || "",

    internalNotes: followUp?.internalNotes || "",
  });

  const [error, setError] = useState("");

  /* =======================================================
     RELATED RECORDS
  ======================================================= */

  const relatedRecords = useMemo<RelatedRecord[]>(() => {
    if (form.relatedType === "Lead") {
      return leads.map((lead) => ({
        id: lead.id,
        name: lead.companyName || lead.contactPerson || lead.phone || lead.id,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
      }));
    }

    if (form.relatedType === "Client") {
      return clients.map((client) => ({
        id: client.id,
        name:
          client.company || client.contactPerson || client.phone || client.id,
        contactPerson: client.contactPerson,
        phone: client.phone,
      }));
    }

    if (form.relatedType === "Quotation") {
      return quotations.map((quotation) => ({
        id: quotation.id,
        name: getRelatedRecordName(quotation),
        contactPerson: getRelatedContactPerson(quotation),
        phone: getRelatedPhone(quotation),
      }));
    }

    return renewals.map((renewal) => ({
      id: renewal.id,
      name: getRelatedRecordName(renewal),
      contactPerson: getRelatedContactPerson(renewal),
      phone: getRelatedPhone(renewal),
    }));
  }, [form.relatedType, leads, clients, quotations, renewals]);

  /* =======================================================
     AUTO FILL CONTACT DETAILS
  ======================================================= */

  useEffect(() => {
    if (!followUp) return;

    /*
     * Older follow-ups may not have relatedId.
     * In that case we don't overwrite anything.
     */
    if (!form.relatedId) return;

    const selected = relatedRecords.find(
      (record) => record.id === form.relatedId,
    );

    if (!selected) return;

    /*
     * Only auto-fill when the current values
     * are empty. This prevents overwriting
     * manually edited contact information.
     */
    setForm((previous) => ({
      ...previous,

      contactPerson: previous.contactPerson || selected.contactPerson,

      phone: previous.phone || selected.phone,
    }));

    // Intentionally run when the selected
    // related record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.relatedId, form.relatedType]);

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  function updateField(field: string, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* =======================================================
     RELATED TYPE CHANGE
  ======================================================= */

  function handleRelatedTypeChange(type: FollowUpRelatedType) {
    setForm((previous) => ({
      ...previous,
      relatedType: type,
      relatedId: "",
      contactPerson: "",
      phone: "",
    }));
  }

  /* =======================================================
     RELATED RECORD CHANGE
  ======================================================= */

  function handleRelatedRecordChange(recordId: string) {
    const selected = relatedRecords.find((record) => record.id === recordId);

    setForm((previous) => ({
      ...previous,
      relatedId: recordId,
      contactPerson: selected?.contactPerson || "",
      phone: selected?.phone || "",
    }));
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!followUp) {
      setError("Follow-up record could not be found.");
      return;
    }

    if (!form.relatedId) {
      setError(`Please select a ${form.relatedType}.`);
      return;
    }

    if (!form.assignedTo) {
      setError("Please select a team member.");
      return;
    }

    if (!form.followUpDate) {
      setError("Please select a follow-up date.");
      return;
    }

    if (!form.followUpTime) {
      setError("Please select a follow-up time.");
      return;
    }

    const selectedRecord = relatedRecords.find(
      (record) => record.id === form.relatedId,
    );

    if (!selectedRecord) {
      setError("Selected record could not be found.");
      return;
    }

    updateFollowUp(followUp.id, {
      relatedType: form.relatedType,
      relatedId: form.relatedId,
      relatedName: selectedRecord.name,

      clientId: form.relatedType === "Client" ? form.relatedId : "",

      clientName: form.relatedType === "Client" ? selectedRecord.name : "",

      contactPerson: form.contactPerson.trim(),

      phone: form.phone.trim(),

      purpose: form.purpose.trim(),

      followUpType: form.followUpType,

      followUpDate: form.followUpDate,

      followUpTime: form.followUpTime,

      priority: form.priority,

      assignedTo: form.assignedTo,

      reminder: form.reminder,

      nextFollowUpDate: form.nextFollowUpDate,

      nextFollowUpTime: form.nextFollowUpTime,

      nextAction: form.nextAction.trim(),

      notes: form.notes.trim(),

      clientResponse: form.clientResponse.trim(),

      internalNotes: form.internalNotes.trim(),
    });

    navigate(`/follow-ups/${followUp.id}`);
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

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

        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">📞</div>

          <h2 className="text-xl font-semibold text-gray-900">
            Follow-up not found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            This follow-up record could not be found.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}

      <div className="mb-7">
        <button
          type="button"
          onClick={() => navigate(`/follow-ups/${followUp.id}`)}
          className="mb-5 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Follow-up
        </button>

        <h1 className="text-3xl font-bold text-gray-900">Edit Follow-up</h1>

        <p className="mt-1 text-gray-500">
          Update follow-up details without changing the completed/pending
          status.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* =================================================
            RELATED RECORD
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Follow-up For
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select the CRM record this follow-up belongs to.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Related To *
              </label>

              <select
                value={form.relatedType}
                onChange={(e) =>
                  handleRelatedTypeChange(e.target.value as FollowUpRelatedType)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Lead">Lead</option>
                <option value="Client">Client</option>
                <option value="Quotation">Quotation</option>
                <option value="Renewal">Renewal</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select {form.relatedType} *
              </label>

              <select
                value={form.relatedId}
                onChange={(e) => handleRelatedRecordChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select {form.relatedType}</option>

                {relatedRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.name} — {record.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTACT & ASSIGNMENT
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Contact & Assignment
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contact Person
              </label>

              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                placeholder="Contact person"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mobile
              </label>

              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Mobile number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Assigned To *
              </label>

              <select
                value={form.assignedTo}
                onChange={(e) => updateField("assignedTo", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Team Member</option>

                {internalTeam.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =================================================
            SCHEDULE
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Follow-up Type
              </label>

              <select
                value={form.followUpType}
                onChange={(e) => updateField("followUpType", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {followUpTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Date *
              </label>

              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => updateField("followUpDate", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Time *
              </label>

              <input
                type="time"
                value={form.followUpTime}
                onChange={(e) => updateField("followUpTime", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(e) =>
                  updateField("priority", e.target.value as FollowUpPriority)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reminder
              </label>

              <select
                value={form.reminder}
                onChange={(e) => updateField("reminder", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {reminders.map((reminder) => (
                  <option key={reminder} value={reminder}>
                    {reminder}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Purpose
              </label>

              <input
                type="text"
                value={form.purpose}
                onChange={(e) => updateField("purpose", e.target.value)}
                placeholder="Why are you following up?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            NEXT ACTION
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Next Action</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Follow-up Date
              </label>

              <input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) =>
                  updateField("nextFollowUpDate", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Follow-up Time
              </label>

              <input
                type="time"
                value={form.nextFollowUpTime}
                onChange={(e) =>
                  updateField("nextFollowUpTime", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Action
              </label>

              <input
                type="text"
                value={form.nextAction}
                onChange={(e) => updateField("nextAction", e.target.value)}
                placeholder="Call / Meeting / Send quotation"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            NOTES
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
                placeholder="Follow-up notes"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Client Response
              </label>

              <textarea
                value={form.clientResponse}
                onChange={(e) => updateField("clientResponse", e.target.value)}
                rows={4}
                placeholder="What did the client say?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Internal Notes
              </label>

              <textarea
                value={form.internalNotes}
                onChange={(e) => updateField("internalNotes", e.target.value)}
                rows={4}
                placeholder="Internal team notes"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(`/follow-ups/${followUp.id}`)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
