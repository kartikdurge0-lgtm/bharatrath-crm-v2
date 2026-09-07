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

  /* =======================================================
     URL PARAMETERS
  ======================================================= */

  const initialRelatedType =
    (searchParams.get("relatedType") as FollowUpRelatedType) || "Lead";

  const initialRelatedId = searchParams.get("relatedId") || "";

  /* =======================================================
     TEAM MEMBERS
  ======================================================= */

  const [teamMembers, setTeamMembers] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  /* =======================================================
     LEADS
  ======================================================= */

  const [leads, setLeads] = useState<Awaited<ReturnType<typeof getLeads>>>([]);

  /* =======================================================
     LOCAL RECORDS
     
     IMPORTANT:
     These are loaded once.
     We do NOT call getClients(), getQuotations(),
     getRenewals() directly during every render.
     
     This prevents relatedRecords from changing on
     every render and causing useEffect loops.
  ======================================================= */

  const [clients] = useState(() => getClients());

  const [quotations] = useState(() => getQuotations());

  const [renewals] = useState(() => getRenewals());

  /* =======================================================
     FORM
  ======================================================= */

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

  const [saving, setSaving] = useState(false);

  /* =======================================================
     LOAD LEADS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadLeads() {
      try {
        const data = await getLeads();

        if (!mounted) {
          return;
        }

        setLeads(data);
      } catch (error) {
        console.error("Failed to load leads:", error);

        if (mounted) {
          setError("Failed to load leads.");
        }
      }
    }

    void loadLeads();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOAD INTERNAL TEAM MEMBERS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadTeamMembers() {
      try {
        const persons = await getActiveSalesPersons();

        if (!mounted) {
          return;
        }

        const internalMembers = persons.filter(
          (person) => person.type === "Staff" || person.type === "Part-time",
        );

        setTeamMembers(internalMembers);
      } catch (error) {
        console.error("Failed to load team members:", error);

        if (mounted) {
          setError("Failed to load team members.");
        }
      }
    }

    void loadTeamMembers();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     RELATED RECORDS
     
     IMPORTANT:
     Dependencies are now stable.
     
     We do NOT depend on freshly-created arrays from
     getClients()/getQuotations()/getRenewals().
  ======================================================= */

  const relatedRecords = useMemo<RelatedRecord[]>(() => {
    /* -----------------------------------------------------
       LEADS
    ----------------------------------------------------- */

    if (form.relatedType === "Lead") {
      return leads.map((lead) => ({
        id: lead.id,

        name: lead.companyName || lead.contactPerson || lead.phone || lead.id,

        contactPerson: lead.contactPerson || "",

        phone: lead.phone || "",
      }));
    }

    /* -----------------------------------------------------
       CLIENTS
    ----------------------------------------------------- */

    if (form.relatedType === "Client") {
      return clients.map((client) => ({
        id: client.id,

        name:
          client.company || client.contactPerson || client.phone || client.id,

        contactPerson: client.contactPerson || "",

        phone: client.phone || "",
      }));
    }

    /* -----------------------------------------------------
       QUOTATIONS
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       RENEWALS
    ----------------------------------------------------- */

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

  /* =======================================================
     DEFAULT ASSIGNED TEAM MEMBER
     
     Prefer Vijay.
  ======================================================= */

  useEffect(() => {
    if (form.assignedTo || teamMembers.length === 0) {
      return;
    }

    const vijay = teamMembers.find(
      (person) => person.name.trim().toLowerCase() === "vijay",
    );

    const defaultMember = vijay?.id || teamMembers[0].id;

    setForm((previous) => {
      if (previous.assignedTo) {
        return previous;
      }

      return {
        ...previous,
        assignedTo: defaultMember,
      };
    });
  }, [form.assignedTo, teamMembers]);

  /* =======================================================
     PREFILL RELATED RECORD
     
     Used when coming from:
     
     /add-follow-up?relatedType=Lead&relatedId=LEAD-001
     
     IMPORTANT:
     State is only updated when the values actually
     need to change.
     
     This prevents:
     
     render
       ↓
     useEffect
       ↓
     setForm
       ↓
     render
       ↓
     useEffect
       ↓
     ...
  ======================================================= */

  useEffect(() => {
    if (!initialRelatedId) {
      return;
    }

    const record = relatedRecords.find((item) => item.id === initialRelatedId);

    if (!record) {
      return;
    }

    setForm((previous) => {
      const nextContactPerson = record.contactPerson || "";

      const nextPhone = record.phone || "";

      if (
        previous.relatedId === initialRelatedId &&
        previous.contactPerson === nextContactPerson &&
        previous.phone === nextPhone
      ) {
        return previous;
      }

      return {
        ...previous,

        relatedId: initialRelatedId,

        contactPerson: nextContactPerson,

        phone: nextPhone,
      };
    });
  }, [initialRelatedId, relatedRecords]);

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
    const record = relatedRecords.find((item) => item.id === recordId);

    setForm((previous) => ({
      ...previous,

      relatedId: recordId,

      contactPerson: record?.contactPerson || "",

      phone: record?.phone || "",
    }));
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    setSaving(true);

    try {
      const followUpId = await generateFollowUpId();

      const now = new Date().toISOString();

      const createdFollowUp = await addFollowUp({
        id: followUpId,

        relatedType: form.relatedType,

        relatedId: form.relatedId,

        relatedName: selectedRecord.name,

        /*
         * Compatibility fields.
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
       * addFollowUp() returns the created record
       * only when Supabase insert succeeds.
       */
      if (!createdFollowUp) {
        throw new Error("Follow-up could not be saved.");
      }

      /*
       * Return to the Lead after successful save.
       */
      if (form.relatedType === "Lead" && form.relatedId) {
        navigate(`/leads/${encodeURIComponent(form.relatedId)}`);

        return;
      }

      navigate("/follow-ups");
    } catch (error) {
      console.error("Failed to save follow-up:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save follow-up. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-5xl">
      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate("/follow-ups")}
        className="mb-5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to Follow-ups
      </button>

      {/* HEADER */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Add Follow-up</h1>

        <p className="mt-1 text-gray-500">
          Schedule a follow-up for a lead, client, quotation or renewal.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* =================================================
            RELATED RECORD
        ================================================= */}

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
            {/* RELATED TYPE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Related To *
              </label>

              <select
                value={form.relatedType}
                onChange={(event) =>
                  handleRelatedTypeChange(
                    event.target.value as FollowUpRelatedType,
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Lead">Lead</option>

                <option value="Client">Client</option>

                <option value="Quotation">Quotation</option>

                <option value="Renewal">Renewal</option>
              </select>
            </div>

            {/* RELATED RECORD */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select {form.relatedType} *
              </label>

              <select
                value={form.relatedId}
                onChange={(event) =>
                  handleRelatedRecordChange(event.target.value)
                }
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

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Contact & Assignment
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            {/* CONTACT */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contact Person
              </label>

              <input
                type="text"
                value={form.contactPerson}
                onChange={(event) =>
                  updateField("contactPerson", event.target.value)
                }
                placeholder="Contact person"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* MOBILE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mobile
              </label>

              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="Mobile number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* ASSIGNED TO */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Assigned To *
              </label>

              <select
                value={form.assignedTo}
                onChange={(event) =>
                  updateField("assignedTo", event.target.value)
                }
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

        {/* =================================================
            FOLLOW-UP
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            {/* TYPE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Follow-up Type
              </label>

              <select
                value={form.followUpType}
                onChange={(event) =>
                  updateField("followUpType", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {followUpTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Date *
              </label>

              <input
                type="date"
                value={form.followUpDate}
                onChange={(event) =>
                  updateField("followUpDate", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* TIME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Time *
              </label>

              <input
                type="time"
                value={form.followUpTime}
                onChange={(event) =>
                  updateField("followUpTime", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* PRIORITY */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(event) =>
                  updateField("priority", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            {/* REMINDER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reminder
              </label>

              <select
                value={form.reminder}
                onChange={(event) =>
                  updateField("reminder", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {reminders.map((reminder) => (
                  <option key={reminder} value={reminder}>
                    {reminder}
                  </option>
                ))}
              </select>
            </div>

            {/* PURPOSE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Purpose
              </label>

              <input
                type="text"
                value={form.purpose}
                onChange={(event) => updateField("purpose", event.target.value)}
                placeholder="Why are you following up?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            NEXT ACTION
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Next Action</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            {/* NEXT DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Follow-up Date
              </label>

              <input
                type="date"
                value={form.nextFollowUpDate}
                onChange={(event) =>
                  updateField("nextFollowUpDate", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* NEXT TIME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Follow-up Time
              </label>

              <input
                type="time"
                value={form.nextFollowUpTime}
                onChange={(event) =>
                  updateField("nextFollowUpTime", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* NEXT ACTION */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Next Action
              </label>

              <input
                type="text"
                value={form.nextAction}
                onChange={(event) =>
                  updateField("nextAction", event.target.value)
                }
                placeholder="Call / Meeting / Send quotation"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            NOTES
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            {/* NOTES */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                placeholder="Follow-up notes"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* INTERNAL NOTES */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Internal Notes
              </label>

              <textarea
                value={form.internalNotes}
                onChange={(event) =>
                  updateField("internalNotes", event.target.value)
                }
                rows={3}
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
            disabled={saving}
            onClick={() => navigate("/follow-ups")}
            className="rounded-lg border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Follow-up"}
          </button>
        </div>
      </form>
    </div>
  );
}
