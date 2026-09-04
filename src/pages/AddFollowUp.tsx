import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { addFollowUp, generateFollowUpId } from "../data/followUpStore";

import type {
  FollowUpPriority,
  FollowUpRelatedType,
} from "../data/followUpStore";

import { getLeads } from "../data/leadStore";
import { getClients } from "../data/clientStore";
import { getQuotations } from "../data/quotationStore";
import { getRenewals } from "../data/renewalStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";

const priorities: FollowUpPriority[] = ["High", "Medium", "Low"];

const followUpTypes = ["Call", "WhatsApp", "Meeting", "Email", "Demo", "Other"];

const reminders = [
  "No Reminder",
  "15 Minutes Before",
  "30 Minutes Before",
  "1 Hour Before",
  "1 Day Before",
];

type RelatedRecord = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
};

export default function AddFollowUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [teamMembers, setTeamMembers] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  const leads = getLeads();
  const clients = getClients();
  const quotations = getQuotations();
  const renewals = getRenewals();

  const initialRelatedType =
    (searchParams.get("relatedType") as FollowUpRelatedType) || "Lead";

  const initialRelatedId = searchParams.get("relatedId") || "";

  const [form, setForm] = useState({
    relatedType: initialRelatedType,
    relatedId: initialRelatedId,

    contactPerson: "",
    phone: "",

    purpose: "",
    followUpType: "Call",

    followUpDate: "",
    followUpTime: "",

    priority: "Medium" as FollowUpPriority,

    assignedTo: "",

    reminder: "No Reminder",

    nextFollowUpDate: "",
    nextFollowUpTime: "",

    nextAction: "",

    notes: "",
    clientResponse: "",
    internalNotes: "",
  });

  const [error, setError] = useState("");

  /*
   * Load active internal Bharatrath team members.
   * External Sales Persons are excluded.
   */
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const persons = await getActiveSalesPersons();

        setTeamMembers(
          persons.filter(
            (person) => person.type === "Staff" || person.type === "Part-time",
          ),
        );
      } catch (error) {
        console.error("Failed to load team members:", error);
        setError("Failed to load team members.");
      }
    };

    loadTeamMembers();
  }, []);

  /*
   * Convert different CRM records into one
   * common format for the dropdown.
   */
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
      return quotations.map((quotation) => {
        const quotationRecord = quotation as typeof quotation & {
          clientName?: string;
          companyName?: string;
          contactPerson?: string;
          phone?: string;
        };

        return {
          id: quotation.id,
          name:
            quotationRecord.clientName ||
            quotationRecord.companyName ||
            quotation.id,
          contactPerson: quotationRecord.contactPerson || "",
          phone: quotationRecord.phone || "",
        };
      });
    }

    return renewals.map((renewal) => {
      const renewalRecord = renewal as typeof renewal & {
        clientName?: string;
        companyName?: string;
        contactPerson?: string;
        phone?: string;
      };

      return {
        id: renewal.id,
        name:
          renewalRecord.clientName || renewalRecord.companyName || renewal.id,
        contactPerson: renewalRecord.contactPerson || "",
        phone: renewalRecord.phone || "",
      };
    });
  }, [form.relatedType, leads, clients, quotations, renewals]);

  /*
   * Set default internal team member.
   * Prefer Vijay if available.
   */
  useEffect(() => {
    if (!form.assignedTo && teamMembers.length > 0) {
      const vijay = teamMembers.find(
        (person) => person.name.toLowerCase() === "vijay",
      );

      setForm((previous) => ({
        ...previous,
        assignedTo: vijay?.id ?? teamMembers[0].id,
      }));
    }
  }, [form.assignedTo, teamMembers]);

  /*
   * When coming from Lead Details:
   *
   * /add-follow-up?relatedType=Lead&relatedId=LEAD-001
   *
   * automatically fill contact information.
   */
  useEffect(() => {
    if (!initialRelatedId) return;

    const record = relatedRecords.find((item) => item.id === initialRelatedId);

    if (!record) return;

    setForm((previous) => ({
      ...previous,
      relatedId: initialRelatedId,
      contactPerson: record.contactPerson || "",
      phone: record.phone || "",
    }));
  }, [initialRelatedId, relatedRecords]);

  function updateField(field: string, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleRelatedTypeChange(type: FollowUpRelatedType) {
    setForm((previous) => ({
      ...previous,
      relatedType: type,
      relatedId: "",
      contactPerson: "",
      phone: "",
    }));
  }

  function handleRelatedRecordChange(recordId: string) {
    const record = relatedRecords.find((item) => item.id === recordId);

    setForm((previous) => ({
      ...previous,
      relatedId: recordId,
      contactPerson: record?.contactPerson || "",
      phone: record?.phone || "",
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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

    const now = new Date().toISOString();

    addFollowUp({
      id: generateFollowUpId(),

      relatedType: form.relatedType,

      relatedId: form.relatedId,

      relatedName: selectedRecord.name,

      /*
       * Compatibility fields for existing
       * FollowUp structure.
       */
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

      status: "Pending",

      createdAt: now,
    });

    /*
     * If follow-up was created from a Lead,
     * return to that Lead.
     *
     * Otherwise return to universal Follow-ups.
     */
    if (form.relatedType === "Lead" && form.relatedId) {
      navigate(`/leads/${form.relatedId}`);
    } else {
      navigate("/follow-ups");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => navigate("/follow-ups")}
        className="mb-5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to Follow-ups
      </button>

      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Add Follow-up</h1>

        <p className="mt-1 text-gray-500">
          Schedule a follow-up for a lead, client, quotation or renewal.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Related Record */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Follow-up For
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select what this follow-up is related to.
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

        {/* Contact + Assignment */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
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

                {teamMembers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Follow-up */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
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
                onChange={(e) => updateField("priority", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
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

        {/* Next Action */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
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

        {/* Notes */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
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
                rows={3}
                placeholder="Follow-up notes"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Internal Notes
              </label>

              <textarea
                value={form.internalNotes}
                onChange={(e) => updateField("internalNotes", e.target.value)}
                rows={3}
                placeholder="Internal team notes"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate("/follow-ups")}
            className="rounded-lg border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Save Follow-up
          </button>
        </div>
      </form>
    </div>
  );
}
