import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getLead,
  updateLead,
  calculateCommission,
  type Lead,
  type LeadPriority,
  type LeadSource,
} from "../data/leadStore";

import { getActiveSalesPersons } from "../data/salesPersonStore";
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

export default function EditLead() {
  const { leadId } = useParams();
  const navigate = useNavigate();

  /* =======================================================
     LEAD
  ======================================================= */

  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLead() {
      if (!leadId) {
        if (mounted) {
          setLead(null);
          setLoadingLead(false);
        }
        return;
      }

      try {
        const result = await getLead(leadId);

        if (!mounted) return;

        setLead(result);
      } catch (error) {
        console.error("Failed to load lead:", error);

        if (mounted) {
          setLead(null);
        }
      } finally {
        if (mounted) {
          setLoadingLead(false);
        }
      }
    }

    loadLead();

    return () => {
      mounted = false;
    };
  }, [leadId]);

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [leadSource, setLeadSource] = useState<LeadSource>("Website");
  const [sourceDetails, setSourceDetails] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [referencePersonName, setReferencePersonName] = useState("");
  const [referencePersonPhone, setReferencePersonPhone] = useState("");
  const [referencePersonEmail, setReferencePersonEmail] = useState("");

  const [commissionApplicable, setCommissionApplicable] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(0);

  const [requirement, setRequirement] = useState("");
  const [interestedService, setInterestedService] = useState("");

  const [priority, setPriority] = useState<LeadPriority>("Medium");
  const [expectedValue, setExpectedValue] = useState(0);
  const [expectedClosingDate, setExpectedClosingDate] = useState("");

  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpTime, setNextFollowUpTime] = useState("");
  const [nextAction, setNextAction] = useState("");

  /* =======================================================
     SALES PERSONS & SERVICES
  ======================================================= */

  const [salesPersons, setSalesPersons] = useState<
    Awaited<ReturnType<typeof getActiveSalesPersons>>
  >([]);

  const [services, setServices] = useState<
    Awaited<ReturnType<typeof getServices>>
  >([]);

  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD SALES PERSONS & SERVICES
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [persons, serviceList] = await Promise.all([
          getActiveSalesPersons(),
          getServices(),
        ]);

        if (!mounted) return;

        setSalesPersons(persons);

        setServices(
          serviceList.filter((service) => service.status === "Active"),
        );
      } catch (err) {
        console.error("Failed to load Edit Lead data:", err);

        if (mounted) {
          setSalesPersons([]);
          setServices([]);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOAD LEAD INTO FORM
  ======================================================= */

  useEffect(() => {
    if (!lead) return;

    setCompanyName(lead.companyName);
    setContactPerson(lead.contactPerson);
    setPhone(lead.phone);
    setEmail(lead.email);
    setAddress(lead.address);

    setLeadSource(lead.leadSource);
    setSourceDetails(lead.sourceDetails);
    setAssignedTo(lead.assignedTo);

    setReferencePersonName(lead.referencePersonName);
    setReferencePersonPhone(lead.referencePersonPhone);
    setReferencePersonEmail(lead.referencePersonEmail);

    setCommissionApplicable(lead.commissionApplicable);
    setCommissionPercent(lead.commissionPercent);

    setRequirement(lead.requirement);
    setInterestedService(lead.interestedService);

    setPriority(lead.priority);

    setExpectedValue(lead.expectedValue);
    setExpectedClosingDate(lead.expectedClosingDate);

    setNotes(lead.notes);
    setInternalNotes(lead.internalNotes);

    setNextFollowUpDate(lead.nextFollowUpDate);
    setNextFollowUpTime(lead.nextFollowUpTime);
    setNextAction(lead.nextAction);
  }, [lead]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingLead) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Loading lead...</p>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!lead) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-800">Lead not found</h2>

        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  /* =======================================================
     SALES PERSON CHANGE
  ======================================================= */

  const handleSalesPersonChange = (value: string) => {
    setAssignedTo(value);

    const person = salesPersons.find((item) => item.id === value);

    if (person) {
      setCommissionPercent(person.commissionPercent);
      setCommissionApplicable(person.commissionPercent > 0);
    }
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError("");

    if (!companyName.trim() && !contactPerson.trim()) {
      setError("Please enter either Company Name or Contact Person.");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!assignedTo) {
      setError("Please select a Sales Person.");
      return;
    }

    if (commissionPercent < 0 || commissionPercent > 100) {
      setError("Commission percentage must be between 0 and 100.");
      return;
    }

    if (expectedValue < 0) {
      setError("Expected value cannot be negative.");
      return;
    }

    const commissionAmount = commissionApplicable
      ? calculateCommission(expectedValue, commissionPercent)
      : 0;

    try {
      await updateLead(lead.id, {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),

        leadSource,
        sourceDetails: sourceDetails.trim(),

        assignedTo,

        referencePersonName: referencePersonName.trim(),
        referencePersonPhone: referencePersonPhone.trim(),
        referencePersonEmail: referencePersonEmail.trim(),

        commissionApplicable,
        commissionPercent,
        commissionAmount,

        requirement: requirement.trim(),
        interestedService,

        priority,

        expectedValue,
        expectedClosingDate,

        notes: notes.trim(),
        internalNotes: internalNotes.trim(),

        nextFollowUpDate,
        nextFollowUpTime,
        nextAction: nextAction.trim(),

        updatedAt: new Date().toISOString(),
      });

      navigate(`/leads/${lead.id}`);
    } catch (err) {
      console.error("Failed to update lead:", err);
      setError("Failed to update lead. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`/leads/${lead.id}`)}
          className="mb-3 text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Lead
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>

        <p className="mt-1 text-sm text-gray-500">Update lead information</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Company Name"
            value={companyName}
            onChange={setCompanyName}
          />

          <Field
            label="Contact Person"
            value={contactPerson}
            onChange={setContactPerson}
          />

          <Field label="Phone" value={phone} onChange={setPhone} required />

          <Field label="Email" value={email} onChange={setEmail} type="email" />

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </label>

            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
      </section>

      {/* Lead Source */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Lead Source
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            label="Lead Source"
            value={leadSource}
            onChange={(value) => setLeadSource(value as LeadSource)}
            options={leadSources}
          />

          <Field
            label="Source Details"
            value={sourceDetails}
            onChange={setSourceDetails}
            placeholder="Campaign, event, referral details..."
          />
        </div>
      </section>

      {/* Sales Assignment */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Sales Assignment
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sales Person <span className="text-red-500">*</span>
            </label>

            <select
              value={assignedTo}
              onChange={(event) => handleSalesPersonChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select Sales Person</option>

              {salesPersons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} — {person.type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Interested Service
            </label>

            <select
              value={interestedService}
              onChange={(event) => setInterestedService(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select Service</option>

              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.service_name || service.serviceName || service.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Requirement */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Requirement
        </h2>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Requirement
            </label>

            <textarea
              value={requirement}
              onChange={(event) => setRequirement(event.target.value)}
              rows={4}
              placeholder="What does the lead need?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              label="Priority"
              value={priority}
              onChange={(value) => setPriority(value as LeadPriority)}
              options={priorities}
            />

            <Field
              label="Expected Value"
              type="number"
              value={String(expectedValue)}
              onChange={(value) => setExpectedValue(Number(value) || 0)}
            />
          </div>

          <Field
            label="Expected Closing Date"
            type="date"
            value={expectedClosingDate}
            onChange={setExpectedClosingDate}
          />
        </div>
      </section>

      {/* Next Follow-up */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Next Follow-up
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field
            label="Date"
            type="date"
            value={nextFollowUpDate}
            onChange={setNextFollowUpDate}
          />

          <Field
            label="Time"
            type="time"
            value={nextFollowUpTime}
            onChange={setNextFollowUpTime}
          />

          <Field
            label="Next Action"
            value={nextAction}
            onChange={setNextAction}
            placeholder="Call, Demo, Meeting..."
          />
        </div>
      </section>

      {/* More Details */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              More Details
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Reference, commission and internal notes
            </p>
          </div>

          <span className="text-gray-500">{showMore ? "▲" : "▼"}</span>
        </button>

        {showMore && (
          <div className="space-y-6 border-t border-gray-200 p-5">
            {/* Reference */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-800">
                Reference / Referral
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field
                  label="Reference Person"
                  value={referencePersonName}
                  onChange={setReferencePersonName}
                />

                <Field
                  label="Reference Phone"
                  value={referencePersonPhone}
                  onChange={setReferencePersonPhone}
                />

                <Field
                  label="Reference Email"
                  value={referencePersonEmail}
                  onChange={setReferencePersonEmail}
                  type="email"
                />
              </div>
            </div>

            {/* Commission */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-800">
                Commission
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <input
                    type="checkbox"
                    checked={commissionApplicable}
                    onChange={(event) =>
                      setCommissionApplicable(event.target.checked)
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-gray-700">
                    Commission Applicable
                  </span>
                </label>

                {commissionApplicable && (
                  <Field
                    label="Commission %"
                    type="number"
                    value={String(commissionPercent)}
                    onChange={(value) =>
                      setCommissionPercent(Number(value) || 0)
                    }
                  />
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Internal Notes
                </label>

                <textarea
                  value={internalNotes}
                  onChange={(event) => setInternalNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={() => navigate(`/leads/${lead.id}`)}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
