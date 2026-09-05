import { supabase } from "../lib/supabase";
import { createActivityLog } from "./activityLogStore";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Follow-up"
  | "Quotation Sent"
  | "Negotiation"
  | "Won"
  | "Lost";

export type LeadPriority = "High" | "Medium" | "Low";

export type LeadSource =
  | "Website"
  | "WhatsApp"
  | "Facebook"
  | "Instagram"
  | "Referral"
  | "Event"
  | "Existing Client"
  | "Cold Call"
  | "Other";

export type CommissionStatus =
  | "Not Applicable"
  | "Pending"
  | "Approved"
  | "Paid";

export type Lead = {
  id: string;

  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;

  leadSource: LeadSource;
  sourceDetails: string;

  assignedTo: string;
  followUpAssignedTo: string;

  referencePersonName: string;
  referencePersonPhone: string;
  referencePersonEmail: string;

  commissionApplicable: boolean;
  commissionPercent: number;
  commissionAmount: number;
  commissionStatus: CommissionStatus;
  commissionPaidDate?: string;

  requirement: string;
  interestedService: string;

  priority: LeadPriority;
  status: LeadStatus;

  expectedValue: number;
  expectedClosingDate: string;

  notes: string;
  internalNotes: string;

  nextFollowUpDate: string;
  nextFollowUpTime: string;
  nextAction: string;

  createdAt: string;
  updatedAt?: string;
  convertedAt?: string;
  convertedClientId?: string;
  lostReason?: string;
};

type LeadRow = {
  id: number;

  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;

  lead_source: string | null;
  source_details: string | null;

  assigned_to_id: number | null;
  follow_up_assigned_to_id: number | null;

  reference_person_name: string | null;
  reference_person_phone: string | null;
  reference_person_email: string | null;

  commission_applicable: boolean;
  commission_percent: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  commission_paid_date: string | null;

  requirement: string | null;
  interested_service: string | null;

  priority: string;
  status: string;

  expected_value: number | null;
  expected_closing_date: string | null;

  notes: string | null;
  internal_notes: string | null;

  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  next_action: string | null;

  created_by: string | null;
  converted_at: string | null;
  converted_client_id: number | null;
  lost_reason: string | null;

  created_at: string;
  updated_at: string;
};

/* =========================================================
   SALES PERSON HELPERS
========================================================= */

function displaySalesPersonId(id: number | null): string {
  if (!id) {
    return "";
  }

  return `SP-${String(id).padStart(3, "0")}`;
}

function databaseSalesPersonId(displayId: string): number | null {
  const match = displayId.match(/^SP-(\d+)$/);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id) ? id : null;
}

/* =========================================================
   DATABASE → LEAD
========================================================= */

function toLead(row: LeadRow): Lead {
  return {
    id: `LEAD-${String(row.id).padStart(3, "0")}`,

    companyName: row.company_name,
    contactPerson: row.contact_person ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",

    leadSource: (row.lead_source as LeadSource) ?? "Other",

    sourceDetails: row.source_details ?? "",

    assignedTo: displaySalesPersonId(row.assigned_to_id),

    followUpAssignedTo: displaySalesPersonId(row.follow_up_assigned_to_id),

    referencePersonName: row.reference_person_name ?? "",

    referencePersonPhone: row.reference_person_phone ?? "",

    referencePersonEmail: row.reference_person_email ?? "",

    commissionApplicable: row.commission_applicable ?? false,

    commissionPercent: Number(row.commission_percent ?? 0),

    commissionAmount: Number(row.commission_amount ?? 0),

    commissionStatus:
      (row.commission_status as CommissionStatus) ?? "Not Applicable",

    commissionPaidDate: row.commission_paid_date ?? undefined,

    requirement: row.requirement ?? "",

    interestedService: row.interested_service ?? "",

    priority: (row.priority as LeadPriority) ?? "Medium",

    status: (row.status as LeadStatus) ?? "New",

    expectedValue: Number(row.expected_value ?? 0),

    expectedClosingDate: row.expected_closing_date ?? "",

    notes: row.notes ?? "",

    internalNotes: row.internal_notes ?? "",

    nextFollowUpDate: row.next_follow_up_date ?? "",

    nextFollowUpTime: row.next_follow_up_time ?? "",

    nextAction: row.next_action ?? "",

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    convertedAt: row.converted_at ?? undefined,

    convertedClientId:
      row.converted_client_id !== null
        ? String(row.converted_client_id)
        : undefined,

    lostReason: row.lost_reason ?? undefined,
  };
}

/* =========================================================
   GET ALL LEADS
========================================================= */

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Failed to load leads:", error);

    throw error;
  }

  return (data as LeadRow[]).map(toLead);
}

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

export async function saveLeads(_leads: Lead[]): Promise<void> {
  /*
   * Leads are stored directly in Supabase.
   * Function kept so existing pages do not break.
   */
}

/* =========================================================
   GET SINGLE LEAD
========================================================= */

export async function getLead(id: string): Promise<Lead | null> {
  const match = id.match(/^LEAD-(\d+)$/);

  if (!match) {
    return null;
  }

  const databaseId = Number(match[1]);

  if (!Number.isFinite(databaseId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load lead:", error);

    throw error;
  }

  return data ? toLead(data as LeadRow) : null;
}

/* =========================================================
   GENERATE LEAD ID
========================================================= */

export function generateLeadId(): string {
  return "LEAD-NEW";
}

/* =========================================================
   ADD LEAD
========================================================= */

export async function addLead(lead: Lead): Promise<Lead> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      company_name: lead.companyName,

      contact_person: lead.contactPerson || null,

      phone: lead.phone || null,

      email: lead.email || null,

      address: lead.address || null,

      lead_source: lead.leadSource,

      source_details: lead.sourceDetails || null,

      assigned_to_id: databaseSalesPersonId(lead.assignedTo),

      follow_up_assigned_to_id: databaseSalesPersonId(lead.followUpAssignedTo),

      reference_person_name: lead.referencePersonName || null,

      reference_person_phone: lead.referencePersonPhone || null,

      reference_person_email: lead.referencePersonEmail || null,

      commission_applicable: lead.commissionApplicable,

      commission_percent: lead.commissionPercent,

      commission_amount: lead.commissionAmount,

      commission_status: lead.commissionStatus,

      commission_paid_date: lead.commissionPaidDate
        ? lead.commissionPaidDate.split("T")[0]
        : null,

      requirement: lead.requirement || null,

      interested_service: lead.interestedService || null,

      priority: lead.priority,

      status: lead.status,

      expected_value: lead.expectedValue,

      expected_closing_date: lead.expectedClosingDate || null,

      notes: lead.notes || null,

      internal_notes: lead.internalNotes || null,

      next_follow_up_date: lead.nextFollowUpDate || null,

      next_follow_up_time: lead.nextFollowUpTime || null,

      next_action: lead.nextAction || null,

      created_by: user.id,

      converted_at: lead.convertedAt || null,

      converted_client_id: lead.convertedClientId
        ? Number(lead.convertedClientId)
        : null,

      lost_reason: lead.lostReason || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add lead:", error);

    throw error;
  }

  const createdLead = toLead(data as LeadRow);

  /* -------------------------------------------------------
     ACTIVITY HISTORY
  ------------------------------------------------------- */

  await createActivityLog({
    action: "CREATE",
    module: "Leads",

    record_id: createdLead.id,

    record_name: createdLead.companyName,

    description: `Created new lead "${createdLead.companyName}"`,

    new_data: {
      companyName: createdLead.companyName,

      contactPerson: createdLead.contactPerson,

      phone: createdLead.phone,

      email: createdLead.email,

      status: createdLead.status,

      priority: createdLead.priority,

      leadSource: createdLead.leadSource,

      expectedValue: createdLead.expectedValue,

      assignedTo: createdLead.assignedTo,
    },
  });

  return createdLead;
}

/* =========================================================
   UPDATE LEAD
========================================================= */

export async function updateLead(
  id: string,
  updates: Partial<Lead>,
): Promise<Lead | null> {
  const match = id.match(/^LEAD-(\d+)$/);

  if (!match) {
    return null;
  }

  const databaseId = Number(match[1]);

  if (!Number.isFinite(databaseId)) {
    return null;
  }

  /* -------------------------------------------------------
     GET OLD RECORD
  ------------------------------------------------------- */

  const existingLead = await getLead(id);

  if (!existingLead) {
    return null;
  }

  const dbUpdates: Record<string, unknown> = {};

  /* -------------------------------------------------------
     BASIC DETAILS
  ------------------------------------------------------- */

  if (updates.companyName !== undefined) {
    dbUpdates.company_name = updates.companyName;
  }

  if (updates.contactPerson !== undefined) {
    dbUpdates.contact_person = updates.contactPerson || null;
  }

  if (updates.phone !== undefined) {
    dbUpdates.phone = updates.phone || null;
  }

  if (updates.email !== undefined) {
    dbUpdates.email = updates.email || null;
  }

  if (updates.address !== undefined) {
    dbUpdates.address = updates.address || null;
  }

  /* -------------------------------------------------------
     SOURCE
  ------------------------------------------------------- */

  if (updates.leadSource !== undefined) {
    dbUpdates.lead_source = updates.leadSource;
  }

  if (updates.sourceDetails !== undefined) {
    dbUpdates.source_details = updates.sourceDetails || null;
  }

  /* -------------------------------------------------------
     ASSIGNMENT
  ------------------------------------------------------- */

  if (updates.assignedTo !== undefined) {
    dbUpdates.assigned_to_id = databaseSalesPersonId(updates.assignedTo);
  }

  if (updates.followUpAssignedTo !== undefined) {
    dbUpdates.follow_up_assigned_to_id = databaseSalesPersonId(
      updates.followUpAssignedTo,
    );
  }

  /* -------------------------------------------------------
     REFERENCE
  ------------------------------------------------------- */

  if (updates.referencePersonName !== undefined) {
    dbUpdates.reference_person_name = updates.referencePersonName || null;
  }

  if (updates.referencePersonPhone !== undefined) {
    dbUpdates.reference_person_phone = updates.referencePersonPhone || null;
  }

  if (updates.referencePersonEmail !== undefined) {
    dbUpdates.reference_person_email = updates.referencePersonEmail || null;
  }

  /* -------------------------------------------------------
     COMMISSION
  ------------------------------------------------------- */

  if (updates.commissionApplicable !== undefined) {
    dbUpdates.commission_applicable = updates.commissionApplicable;
  }

  if (updates.commissionPercent !== undefined) {
    dbUpdates.commission_percent = updates.commissionPercent;
  }

  if (updates.commissionAmount !== undefined) {
    dbUpdates.commission_amount = updates.commissionAmount;
  }

  if (updates.commissionStatus !== undefined) {
    dbUpdates.commission_status = updates.commissionStatus;
  }

  if (updates.commissionPaidDate !== undefined) {
    dbUpdates.commission_paid_date = updates.commissionPaidDate
      ? updates.commissionPaidDate.split("T")[0]
      : null;
  }

  /* -------------------------------------------------------
     REQUIREMENT
  ------------------------------------------------------- */

  if (updates.requirement !== undefined) {
    dbUpdates.requirement = updates.requirement || null;
  }

  if (updates.interestedService !== undefined) {
    dbUpdates.interested_service = updates.interestedService || null;
  }

  /* -------------------------------------------------------
     STATUS / PRIORITY
  ------------------------------------------------------- */

  if (updates.priority !== undefined) {
    dbUpdates.priority = updates.priority;
  }

  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
  }

  /* -------------------------------------------------------
     VALUE / CLOSING
  ------------------------------------------------------- */

  if (updates.expectedValue !== undefined) {
    dbUpdates.expected_value = updates.expectedValue;
  }

  if (updates.expectedClosingDate !== undefined) {
    dbUpdates.expected_closing_date = updates.expectedClosingDate || null;
  }

  /* -------------------------------------------------------
     NOTES
  ------------------------------------------------------- */

  if (updates.notes !== undefined) {
    dbUpdates.notes = updates.notes || null;
  }

  if (updates.internalNotes !== undefined) {
    dbUpdates.internal_notes = updates.internalNotes || null;
  }

  /* -------------------------------------------------------
     FOLLOW-UP
  ------------------------------------------------------- */

  if (updates.nextFollowUpDate !== undefined) {
    dbUpdates.next_follow_up_date = updates.nextFollowUpDate || null;
  }

  if (updates.nextFollowUpTime !== undefined) {
    dbUpdates.next_follow_up_time = updates.nextFollowUpTime || null;
  }

  if (updates.nextAction !== undefined) {
    dbUpdates.next_action = updates.nextAction || null;
  }

  /* -------------------------------------------------------
     CONVERSION
  ------------------------------------------------------- */

  if (updates.convertedAt !== undefined) {
    dbUpdates.converted_at = updates.convertedAt || null;
  }

  if (updates.convertedClientId !== undefined) {
    dbUpdates.converted_client_id = updates.convertedClientId
      ? Number(updates.convertedClientId)
      : null;
  }

  /* -------------------------------------------------------
     LOST REASON
  ------------------------------------------------------- */

  if (updates.lostReason !== undefined) {
    dbUpdates.lost_reason = updates.lostReason || null;
  }

  /* -------------------------------------------------------
     UPDATE DATABASE
  ------------------------------------------------------- */

  const { data, error } = await supabase
    .from("leads")
    .update(dbUpdates)
    .eq("id", databaseId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update lead:", error);

    throw error;
  }

  const updatedLead = toLead(data as LeadRow);

  /* -------------------------------------------------------
     DETERMINE ACTIVITY TYPE
  ------------------------------------------------------- */

  let activityAction = "UPDATE";

  let activityDescription = `Updated lead "${updatedLead.companyName}"`;

  /*
   * Status changed
   */
  if (updates.status !== undefined && updates.status !== existingLead.status) {
    activityAction = "STATUS_CHANGED";

    activityDescription = `Changed lead status from "${existingLead.status}" to "${updatedLead.status}"`;
  }

  /*
   * Won
   */
  if (updates.status === "Won" && existingLead.status !== "Won") {
    activityAction = "LEAD_WON";

    activityDescription = `Marked lead "${updatedLead.companyName}" as Won`;
  }

  /*
   * Lost
   */
  if (updates.status === "Lost" && existingLead.status !== "Lost") {
    activityAction = "LEAD_LOST";

    activityDescription = `Marked lead "${updatedLead.companyName}" as Lost${
      updatedLead.lostReason ? ` — Reason: ${updatedLead.lostReason}` : ""
    }`;
  }

  /*
   * Commission paid
   */
  if (
    updates.commissionStatus === "Paid" &&
    existingLead.commissionStatus !== "Paid"
  ) {
    activityAction = "COMMISSION_PAID";

    activityDescription = `Marked commission as Paid for lead "${updatedLead.companyName}"`;
  }

  /* -------------------------------------------------------
     ACTIVITY HISTORY
  ------------------------------------------------------- */

  await createActivityLog({
    action: activityAction,

    module: "Leads",

    record_id: updatedLead.id,

    record_name: updatedLead.companyName,

    description: activityDescription,

    old_data: {
      companyName: existingLead.companyName,

      contactPerson: existingLead.contactPerson,

      phone: existingLead.phone,

      email: existingLead.email,

      status: existingLead.status,

      priority: existingLead.priority,

      expectedValue: existingLead.expectedValue,

      commissionApplicable: existingLead.commissionApplicable,

      commissionPercent: existingLead.commissionPercent,

      commissionAmount: existingLead.commissionAmount,

      commissionStatus: existingLead.commissionStatus,

      lostReason: existingLead.lostReason,
    },

    new_data: {
      companyName: updatedLead.companyName,

      contactPerson: updatedLead.contactPerson,

      phone: updatedLead.phone,

      email: updatedLead.email,

      status: updatedLead.status,

      priority: updatedLead.priority,

      expectedValue: updatedLead.expectedValue,

      commissionApplicable: updatedLead.commissionApplicable,

      commissionPercent: updatedLead.commissionPercent,

      commissionAmount: updatedLead.commissionAmount,

      commissionStatus: updatedLead.commissionStatus,

      lostReason: updatedLead.lostReason,
    },
  });

  return updatedLead;
}

/* =========================================================
   UPDATE STATUS
========================================================= */

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<Lead | null> {
  return updateLead(id, {
    status,
  });
}

/* =========================================================
   COMMISSION CALCULATION
========================================================= */

export function calculateCommission(
  expectedValue: number,
  commissionPercent: number,
): number {
  if (!Number.isFinite(expectedValue) || !Number.isFinite(commissionPercent)) {
    return 0;
  }

  return Math.round((expectedValue * commissionPercent) / 100);
}

/* =========================================================
   UPDATE COMMISSION
========================================================= */

export async function updateLeadCommission(
  id: string,
  commissionPercent: number,
  commissionApplicable: boolean,
): Promise<Lead | null> {
  const lead = await getLead(id);

  if (!lead) {
    return null;
  }

  const commissionAmount = commissionApplicable
    ? calculateCommission(lead.expectedValue, commissionPercent)
    : 0;

  const updated = await updateLead(id, {
    commissionApplicable,
    commissionPercent,
    commissionAmount,
    commissionStatus: commissionApplicable ? "Pending" : "Not Applicable",
  });

  return updated;
}

/* =========================================================
   MARK COMMISSION PAID
========================================================= */

export async function markCommissionPaid(id: string): Promise<Lead | null> {
  return updateLead(id, {
    commissionStatus: "Paid",
    commissionPaidDate: new Date().toISOString().split("T")[0],
  });
}

/* =========================================================
   MARK LEAD WON
========================================================= */

export async function markLeadWon(id: string): Promise<Lead | null> {
  return updateLead(id, {
    status: "Won",
    convertedAt: new Date().toISOString(),
  });
}

/* =========================================================
   MARK LEAD LOST
========================================================= */

export async function markLeadLost(
  id: string,
  lostReason: string,
): Promise<Lead | null> {
  return updateLead(id, {
    status: "Lost",
    lostReason,
  });
}

/* =========================================================
   ARCHIVE LEAD
========================================================= */

export async function deleteLead(id: string): Promise<boolean> {
  /*
   * Permanent deletion is intentionally disabled.
   *
   * The lead remains in the database for history/audit.
   */

  const lead = await getLead(id);

  if (!lead) {
    return false;
  }

  const databaseId = Number(id.replace("LEAD-", ""));

  if (!Number.isFinite(databaseId)) {
    return false;
  }

  /*
   * Archive by marking Lost.
   * Do not create a second UPDATE activity.
   */
  const { data, error } = await supabase
    .from("leads")
    .update({
      status: "Lost",
      lost_reason: "Archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", databaseId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to archive lead:", error);

    throw error;
  }

  const archivedLead = toLead(data as LeadRow);

  /* -------------------------------------------------------
     ARCHIVE ACTIVITY
  ------------------------------------------------------- */

  await createActivityLog({
    action: "ARCHIVE",

    module: "Leads",

    record_id: archivedLead.id,

    record_name: archivedLead.companyName,

    description: `Archived lead "${archivedLead.companyName}"`,

    old_data: {
      status: lead.status,

      lostReason: lead.lostReason,
    },

    new_data: {
      status: archivedLead.status,

      lostReason: archivedLead.lostReason,
    },
  });

  return true;
}
