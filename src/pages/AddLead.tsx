import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

import type { LeadPriority, LeadSource } from "../data/leadStore";

import {
  getActiveSalesPersons,
  getInternalTeamMembers,
} from "../data/salesPersonStore";

import { getServices } from "../data/serviceStore";

const leadSources: LeadSource[] = [
  "Website",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "Referral",
  "Event",
  "Existing Client",
  "Cold Call",
  "Other",
];

const priorities: LeadPriority[] = ["High", "Medium", "Low"];

const sourceDetailsMap: Record<Exclude<LeadSource, "Other">, string[]> = {
  Website: [
    "Contact Form",
    "WhatsApp Button",
    "Product Enquiry",
    "General Enquiry",
  ],

  WhatsApp: [
    "Direct Message",
    "WhatsApp Campaign",
    "WhatsApp Group",
    "WhatsApp Referral",
  ],

  Facebook: ["Organic Post", "Facebook Page", "Facebook Ads", "Messenger"],

  Instagram: ["Organic Post", "Instagram DM", "Instagram Ads", "Reel"],

  Referral: [
    "Client Referral",
    "Employee Referral",
    "Partner Referral",
    "Friend / Family",
  ],

  Event: ["Exhibition", "Trade Fair", "Workshop", "Seminar", "Conference"],

  "Existing Client": ["Upsell", "Cross-sell", "Repeat Enquiry"],

  "Cold Call": ["Outbound Call", "Telecalling"],
};

function calculateCommission(
  expectedValue: number,
  commissionPercent: number,
): number {
  if (!Number.isFinite(expectedValue) || !Number.isFinite(commissionPercent)) {
    return 0;
  }

  return Math.round((expectedValue * commissionPercent) / 100);
}

/*
 * UI Sales Person IDs are displayed as SP-001, SP-002, etc.
 * Supabase stores the actual sales_persons.id as bigint.
 */
function getSalesPersonDatabaseId(displayId: string): number {
  const match = displayId.match(/^SP-(\d+)$/);

  if (!match) {
    return NaN;
  }

  return Number(match[1]);
}

export default function AddLead() {
  const navigate = useNavigate();

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  const [teamMembers, setTeamMembers] = useState<
    Awaited<ReturnType<typeof getInternalTeamMembers>>
  >([]);

  const services = getServices();

  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",

    leadSource: "Website" as LeadSource,
    sourceDetails: "",

    assignedTo: "",
    followUpAssignedTo: "",

    referencePersonName: "",
    referencePersonPhone: "",
    referencePersonEmail: "",

    commissionApplicable: false,
    commissionPercent: 0,

    requirement: "",
    interestedService: "",

    priority: "Medium" as LeadPriority,
    expectedValue: 0,
    expectedClosingDate: "",

    notes: "",
    internalNotes: "",

    nextFollowUpDate: "",
    nextFollowUpTime: "",
    nextAction: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===================================================
     LOAD SALES PERSONS
  =================================================== */

  useEffect(() => {
    const loadSalesPersons = async () => {
      try {
        const [activePersons, internalMembers] = await Promise.all([
          getActiveSalesPersons(),
          getInternalTeamMembers(),
        ]);

        setSalesPersons(activePersons);
        setTeamMembers(internalMembers);
      } catch (err) {
        console.error("Failed to load sales persons:", err);
        setError("Failed to load sales persons. Please refresh the page.");
      }
    };

    loadSalesPersons();
  }, []);

  /* ===================================================
     DEFAULT ASSIGNMENTS
  =================================================== */

  useEffect(() => {
    if (!form.assignedTo && salesPersons.length > 0) {
      setForm((previous) => ({
        ...previous,
        assignedTo: salesPersons[0].id,
      }));
    }
  }, [form.assignedTo, salesPersons]);

  useEffect(() => {
    if (!form.followUpAssignedTo && teamMembers.length > 0) {
      const vijay = teamMembers.find(
        (person) => person.name.toLowerCase() === "vijay",
      );

      setForm((previous) => ({
        ...previous,
        followUpAssignedTo: vijay?.id ?? teamMembers[0].id,
      }));
    }
  }, [form.followUpAssignedTo, teamMembers]);

  /* ===================================================
     FIELD UPDATE
  =================================================== */

  function updateField(field: string, value: string | number | boolean) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* ===================================================
     LEAD SOURCE CHANGE
  =================================================== */

  function handleLeadSourceChange(source: LeadSource) {
    setForm((previous) => ({
      ...previous,
      leadSource: source,
      sourceDetails: "",
    }));
  }

  /* ===================================================
     SALES PERSON CHANGE
  =================================================== */

  function handleSalesPersonChange(salesPersonId: string) {
    const selectedPerson = salesPersons.find(
      (person) => person.id === salesPersonId,
    );

    const defaultCommission = selectedPerson?.commissionPercent ?? 0;

    setForm((previous) => ({
      ...previous,
      assignedTo: salesPersonId,
      commissionApplicable: defaultCommission > 0,
      commissionPercent: defaultCommission,
    }));
  }

  /* ===================================================
     SOURCE DETAIL OPTIONS
  =================================================== */

  const sourceDetailOptions =
    form.leadSource !== "Other" ? sourceDetailsMap[form.leadSource] : [];

  /* ===================================================
     SUBMIT
  =================================================== */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!form.companyName.trim() && !form.contactPerson.trim()) {
      setError("Company / Person Name or Contact Person is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Mobile number is required.");
      return;
    }

    if (!form.assignedTo) {
      setError("Please select a Sales Person.");
      return;
    }

    if (!form.followUpAssignedTo) {
      setError("Please select a Follow-up Assigned To.");
      return;
    }

    if (form.commissionPercent < 0 || form.commissionPercent > 100) {
      setError("Commission percentage must be between 0 and 100.");
      return;
    }

    if (form.expectedValue < 0) {
      setError("Expected value cannot be negative.");
      return;
    }

    const commissionAmount = form.commissionApplicable
      ? calculateCommission(form.expectedValue, form.commissionPercent)
      : 0;

    const assignedToId = getSalesPersonDatabaseId(form.assignedTo);
    const followUpAssignedToId = getSalesPersonDatabaseId(
      form.followUpAssignedTo,
    );

    if (!Number.isFinite(assignedToId)) {
      setError("Invalid Sales Person selected.");
      return;
    }

    if (!Number.isFinite(followUpAssignedToId)) {
      setError("Invalid Follow-up Assigned To selected.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      /*
       * IMPORTANT:
       * Do not manually create LEAD-001 here.
       *
       * Supabase leads.id is bigint generated by identity.
       * Database will create the numeric ID automatically.
       */

      const { data: insertedLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          company_name: form.companyName.trim(),
          contact_person: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),

          lead_source: form.leadSource,
          source_details: form.sourceDetails.trim(),

          assigned_to_id: assignedToId,
          follow_up_assigned_to_id: followUpAssignedToId,

          reference_person_name: form.referencePersonName.trim(),
          reference_person_phone: form.referencePersonPhone.trim(),
          reference_person_email: form.referencePersonEmail.trim(),

          commission_applicable: form.commissionApplicable,
          commission_percent: form.commissionPercent,
          commission_amount: commissionAmount,
          commission_status: form.commissionApplicable
            ? "Pending"
            : "Not Applicable",

          requirement: form.requirement.trim(),
          interested_service: form.interestedService,

          priority: form.priority,
          status: "New",

          expected_value: Number(form.expectedValue) || 0,
          expected_closing_date: form.expectedClosingDate || null,

          notes: form.notes.trim(),
          internal_notes: form.internalNotes.trim(),

          next_follow_up_date: form.nextFollowUpDate || null,
          next_follow_up_time: form.nextFollowUpTime || null,
          next_action: form.nextAction.trim(),

          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log("Lead created:", insertedLead);

      navigate("/leads");
    } catch (err) {
      console.error("Add lead error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save lead. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() => navigate("/leads")}
        className="mb-5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to Leads
      </button>

      <div className="mb-7">
        <h1 className="text-3xl font-bold text-gray-900">Add Lead</h1>

        <p className="mt-1 text-gray-500">
          Add a new business opportunity and assign it to a sales person and
          follow-up team member.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================
            LEAD INFORMATION
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Lead Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Company / Person Name
              </label>

              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Company or person name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contact Person
              </label>

              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                placeholder="Contact person name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mobile <span className="text-red-500">*</span>
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
                Email
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Address
              </label>

              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                rows={3}
                placeholder="Business / contact address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            SOURCE & ASSIGNMENT
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Source & Assignment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Sales Person and Follow-up Assigned To are separate
              responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Lead Source <span className="text-red-500">*</span>
              </label>

              <select
                value={form.leadSource}
                onChange={(e) =>
                  handleLeadSourceChange(e.target.value as LeadSource)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {leadSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Source Details
              </label>

              {form.leadSource === "Other" ? (
                <input
                  type="text"
                  value={form.sourceDetails}
                  onChange={(e) => updateField("sourceDetails", e.target.value)}
                  placeholder="Enter source details"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <select
                  value={form.sourceDetails}
                  onChange={(e) => updateField("sourceDetails", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select Source Detail</option>

                  {sourceDetailOptions.map((detail) => (
                    <option key={detail} value={detail}>
                      {detail}
                    </option>
                  ))}
                </select>
              )}

              <p className="mt-1.5 text-xs text-gray-500">
                {form.leadSource === "Other"
                  ? "Enter the specific source manually."
                  : `Select how this lead came through ${form.leadSource}.`}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Sales Person <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate("/add-sales-person")}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </div>

              <select
                value={form.assignedTo}
                onChange={(e) => handleSalesPersonChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Sales Person</option>

                {salesPersons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.type}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 text-xs text-gray-500">
                Person who generated or referred this lead. External persons can
                also be selected.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Follow-up Assigned To <span className="text-red-500">*</span>
              </label>

              <select
                value={form.followUpAssignedTo}
                onChange={(e) =>
                  updateField("followUpAssignedTo", e.target.value)
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

              <p className="mt-1.5 text-xs text-gray-500">
                Bharatrath team member responsible for calling and follow-ups.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reference Person Name
              </label>

              <input
                type="text"
                value={form.referencePersonName}
                onChange={(e) =>
                  updateField("referencePersonName", e.target.value)
                }
                placeholder="Reference person"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reference Person Phone
              </label>

              <input
                type="tel"
                value={form.referencePersonPhone}
                onChange={(e) =>
                  updateField("referencePersonPhone", e.target.value)
                }
                placeholder="Reference mobile"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reference Person Email
              </label>

              <input
                type="email"
                value={form.referencePersonEmail}
                onChange={(e) =>
                  updateField("referencePersonEmail", e.target.value)
                }
                placeholder="Reference email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            REQUIREMENT & OPPORTUNITY
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Requirement & Opportunity
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Requirement
              </label>

              <textarea
                value={form.requirement}
                onChange={(e) => updateField("requirement", e.target.value)}
                rows={4}
                placeholder="What does the lead require?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Interested Service
              </label>

              <select
                value={form.interestedService}
                onChange={(e) =>
                  updateField("interestedService", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Service</option>

                {services.map((service) => (
                  <option key={service.id} value={service.service_name}>
                    {service.service_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(e) =>
                  updateField("priority", e.target.value as LeadPriority)
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expected Value
              </label>

              <input
                type="number"
                min="0"
                value={form.expectedValue}
                onChange={(e) =>
                  updateField("expectedValue", Number(e.target.value))
                }
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expected Closing Date
              </label>

              <input
                type="date"
                value={form.expectedClosingDate}
                onChange={(e) =>
                  updateField("expectedClosingDate", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            COMMISSION
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">Commission</h2>

            <p className="mt-1 text-sm text-gray-500">
              Commission is linked to the Sales Person, not the follow-up team
              member.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            <div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.commissionApplicable}
                  onChange={(e) =>
                    updateField("commissionApplicable", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />

                <span className="text-sm font-medium text-gray-700">
                  Commission Applicable
                </span>
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Commission %
              </label>

              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={!form.commissionApplicable}
                value={form.commissionPercent}
                onChange={(e) =>
                  updateField("commissionPercent", Number(e.target.value))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expected Commission
              </label>

              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-green-700">
                ₹
                {form.commissionApplicable
                  ? calculateCommission(
                      form.expectedValue,
                      form.commissionPercent,
                    ).toLocaleString("en-IN")
                  : "0"}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            NEXT FOLLOW-UP
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Next Follow-up
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Follow-up Date
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
                Follow-up Time
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
                rows={4}
                placeholder="General notes"
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

        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate("/leads")}
            className="rounded-lg border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
