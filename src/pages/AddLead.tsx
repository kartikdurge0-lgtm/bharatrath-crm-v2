import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  addLead,
  calculateCommission,
  generateLeadId,
} from "../data/leadStore";

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

/* =====================================================
   SOURCE DETAILS
===================================================== */

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

/* =====================================================
   ADD LEAD
===================================================== */

export default function AddLead() {
  const navigate = useNavigate();

  const salesPersons = getActiveSalesPersons();
  const teamMembers = getInternalTeamMembers();
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

    if (!form.followUpAssignedTo && teamMembers.length > 0) {
      const vijay = teamMembers.find(
        (person) => person.name.toLowerCase() === "vijay",
      );

      setForm((previous) => ({
        ...previous,
        followUpAssignedTo: vijay?.id ?? teamMembers[0].id,
      }));
    }
  }, [form.assignedTo, form.followUpAssignedTo, salesPersons, teamMembers]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    const now = new Date().toISOString();

    addLead({
      id: generateLeadId(),

      companyName: form.companyName.trim(),

      contactPerson: form.contactPerson.trim(),

      phone: form.phone.trim(),

      email: form.email.trim(),

      address: form.address.trim(),

      leadSource: form.leadSource,

      sourceDetails: form.sourceDetails.trim(),

      assignedTo: form.assignedTo,

      followUpAssignedTo: form.followUpAssignedTo,

      referencePersonName: form.referencePersonName.trim(),

      referencePersonPhone: form.referencePersonPhone.trim(),

      referencePersonEmail: form.referencePersonEmail.trim(),

      commissionApplicable: form.commissionApplicable,

      commissionPercent: form.commissionPercent,

      commissionAmount,

      commissionStatus: form.commissionApplicable
        ? "Pending"
        : "Not Applicable",

      requirement: form.requirement.trim(),

      interestedService: form.interestedService,

      priority: form.priority,

      status: "New",

      expectedValue: Number(form.expectedValue) || 0,

      expectedClosingDate: form.expectedClosingDate,

      notes: form.notes.trim(),

      internalNotes: form.internalNotes.trim(),

      nextFollowUpDate: form.nextFollowUpDate,

      nextFollowUpTime: form.nextFollowUpTime,

      nextAction: form.nextAction.trim(),

      createdAt: now,
    });

    navigate("/leads");
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
            {/* LEAD SOURCE */}
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

            {/* SOURCE DETAILS */}
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

            {/* SALES PERSON */}
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

            {/* FOLLOW-UP ASSIGNED */}
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

            {/* REFERENCE NAME */}
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

            {/* REFERENCE PHONE */}
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

            {/* REFERENCE EMAIL */}
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
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );
}
