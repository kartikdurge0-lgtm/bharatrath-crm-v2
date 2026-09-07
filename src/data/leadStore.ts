import { supabase } from "../lib/supabase";
import { createActivityLog } from "./activityLogStore";

/* =========================================================
   LEAD TYPES
========================================================= */

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

/* =========================================================
   LEAD
========================================================= */

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

  /*
   * IMPORTANT:
   *
   * Frontend always uses CRM Client ID:
   *
   * CL-001
   * CL-002
   * CL-005
   *
   * Database stores numeric clients.id in
   * leads.converted_client_id.
   */
  convertedAt?: string;
  convertedClientId?: string;

  lostReason?: string;
};

/* =========================================================
   DATABASE ROW
========================================================= */

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

  /*
   * Supabase:
   *
   * BIGINT
   * FK -> clients.id
   */
  converted_client_id: number | null;

  lost_reason: string | null;

  created_at: string;
  updated_at: string;
};

/* =========================================================
   CLIENT RELATION ROW
========================================================= */

type ClientRelationRow = {
  id: number;
  crm_client_id: string | null;
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
  const normalized = String(displayId || "").trim();

  const match = normalized.match(/^SP-(\d+)$/);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id) ? id : null;
}

/* =========================================================
   CLIENT CONVERSION HELPERS
========================================================= */

/*
 * FRONTEND
 * --------
 * convertedClientId = "CL-005"
 *
 * DATABASE
 * --------
 * leads.converted_client_id = 45
 *
 * clients:
 * id = 45
 * crm_client_id = "CL-005"
 */

/* ---------------------------------------------------------
   CRM CLIENT ID → SUPABASE CLIENT ID
--------------------------------------------------------- */

async function getSupabaseClientIdByCrmClientId(
  crmClientId: string,
): Promise<number | null> {
  const normalizedId = String(crmClientId || "").trim();

  if (!normalizedId) {
    return null;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("crm_client_id", normalizedId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve CRM client ID:", error);

    throw error;
  }

  if (!data) {
    return null;
  }

  const databaseId = Number(data.id);

  if (!Number.isFinite(databaseId)) {
    throw new Error(
      `Invalid Supabase client ID for CRM client "${normalizedId}".`,
    );
  }

  return databaseId;
}

/* ---------------------------------------------------------
   SUPABASE CLIENT ID → CRM CLIENT ID
--------------------------------------------------------- */

async function getCrmClientIdBySupabaseClientId(
  supabaseClientId: number,
): Promise<string | null> {
  const databaseId = Number(supabaseClientId);

  if (!Number.isFinite(databaseId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("crm_client_id")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve Supabase client ID:", error);

    throw error;
  }

  if (!data?.crm_client_id) {
    return null;
  }

  return String(data.crm_client_id);
}

/* ---------------------------------------------------------
   BULK CLIENT ID RESOLUTION
--------------------------------------------------------- */

async function getCrmClientIdMap(
  supabaseClientIds: number[],
): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  const uniqueIds = Array.from(
    new Set(supabaseClientIds.map(Number).filter((id) => Number.isFinite(id))),
  );

  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, crm_client_id")
    .in("id", uniqueIds);

  if (error) {
    console.error("Failed to resolve converted clients:", error);

    throw error;
  }

  for (const row of (data ?? []) as ClientRelationRow[]) {
    const databaseId = Number(row.id);

    if (Number.isFinite(databaseId) && row.crm_client_id) {
      map.set(databaseId, String(row.crm_client_id));
    }
  }

  return map;
}

/* =========================================================
   DATABASE → LEAD
========================================================= */

function toLead(row: LeadRow, convertedClientId?: string): Lead {
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

    /*
     * IMPORTANT:
     *
     * Never expose numeric Supabase ID here.
     *
     * Frontend gets:
     * CL-005
     */
    convertedClientId,

    lostReason: row.lost_reason ?? undefined,
  };
}

/* =========================================================
   CONVERT DATABASE ROWS TO LEADS
========================================================= */

async function convertLeadRowsToLeads(rows: LeadRow[]): Promise<Lead[]> {
  const convertedClientIds = rows
    .map((row) => row.converted_client_id)
    .filter((id): id is number => id !== null && Number.isFinite(Number(id)));

  const clientMap = await getCrmClientIdMap(convertedClientIds);

  return rows.map((row) => {
    const crmClientId =
      row.converted_client_id !== null
        ? clientMap.get(Number(row.converted_client_id))
        : undefined;

    return toLead(row, crmClientId);
  });
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

  return convertLeadRowsToLeads((data ?? []) as LeadRow[]);
}

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

export async function saveLeads(_leads: Lead[]): Promise<void> {
  /*
   * Leads are stored directly in Supabase.
   *
   * Function intentionally kept so existing pages
   * do not break.
   */
}

/* =========================================================
   GET SINGLE LEAD
========================================================= */

export async function getLead(id: string): Promise<Lead | null> {
  const normalizedId = String(id || "").trim();

  const match = normalizedId.match(/^LEAD-(\d+)$/);

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

  if (!data) {
    return null;
  }

  const row = data as LeadRow;

  let crmClientId: string | undefined;

  if (row.converted_client_id !== null) {
    crmClientId =
      (await getCrmClientIdBySupabaseClientId(
        Number(row.converted_client_id),
      )) ?? undefined;
  }

  return toLead(row, crmClientId);
}

/* =========================================================
   GENERATE LEAD ID
========================================================= */

export function generateLeadId(): string {
  /*
   * Supabase generates the real numeric ID.
   *
   * This function is retained for existing UI code.
   */
  return "LEAD-NEW";
}

/* =========================================================
   ADD LEAD
========================================================= */

export async function addLead(lead: Lead): Promise<Lead> {
  const { data: authData } = await supabase.auth.getUser();

  const user = authData.user;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  /* -------------------------------------------------------
     RESOLVE CONVERTED CLIENT
  ------------------------------------------------------- */

  let convertedClientDatabaseId: number | null = null;

  if (lead.convertedClientId) {
    convertedClientDatabaseId = await getSupabaseClientIdByCrmClientId(
      lead.convertedClientId,
    );

    if (convertedClientDatabaseId === null) {
      throw new Error(
        `Client "${lead.convertedClientId}" was not found in the database.`,
      );
    }
  }

  /* -------------------------------------------------------
     INSERT
  ------------------------------------------------------- */

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

      /*
       * DATABASE GETS NUMERIC FK
       */
      converted_client_id: convertedClientDatabaseId,

      lost_reason: lead.lostReason || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add lead:", error);

    throw error;
  }

  const createdRow = data as LeadRow;

  let createdConvertedClientId: string | undefined;

  if (createdRow.converted_client_id !== null) {
    createdConvertedClientId =
      (await getCrmClientIdBySupabaseClientId(
        Number(createdRow.converted_client_id),
      )) ?? undefined;
  }

  const createdLead = toLead(createdRow, createdConvertedClientId);

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

      convertedClientId: createdLead.convertedClientId,
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
  const normalizedId = String(id || "").trim();

  const match = normalizedId.match(/^LEAD-(\d+)$/);

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

  const existingLead = await getLead(normalizedId);

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
     CONVERSION DATE
  ------------------------------------------------------- */

  if (updates.convertedAt !== undefined) {
    dbUpdates.converted_at = updates.convertedAt || null;
  }

  /* -------------------------------------------------------
     CONVERTED CLIENT
  ------------------------------------------------------- */

  if (updates.convertedClientId !== undefined) {
    if (!updates.convertedClientId) {
      dbUpdates.converted_client_id = null;
    } else {
      /*
       * IMPORTANT:
       *
       * Do NOT do:
       *
       * Number("CL-005")
       *
       * Instead resolve:
       *
       * CL-005 → clients.id
       */

      const clientDatabaseId = await getSupabaseClientIdByCrmClientId(
        updates.convertedClientId,
      );

      if (clientDatabaseId === null) {
        throw new Error(
          `Client "${updates.convertedClientId}" was not found in the database.`,
        );
      }

      dbUpdates.converted_client_id = clientDatabaseId;
    }
  }

  /* -------------------------------------------------------
     LOST REASON
  ------------------------------------------------------- */

  if (updates.lostReason !== undefined) {
    dbUpdates.lost_reason = updates.lostReason || null;
  }

  /* -------------------------------------------------------
     NOTHING TO UPDATE
  ------------------------------------------------------- */

  if (Object.keys(dbUpdates).length === 0) {
    return existingLead;
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

  const updatedRow = data as LeadRow;

  /* -------------------------------------------------------
     RESOLVE CONVERTED CLIENT
  ------------------------------------------------------- */

  let updatedConvertedClientId: string | undefined;

  if (updatedRow.converted_client_id !== null) {
    updatedConvertedClientId =
      (await getCrmClientIdBySupabaseClientId(
        Number(updatedRow.converted_client_id),
      )) ?? undefined;
  }

  const updatedLead = toLead(updatedRow, updatedConvertedClientId);

  /* -------------------------------------------------------
     ACTIVITY TYPE
  ------------------------------------------------------- */

  let activityAction = "UPDATE";

  let activityDescription = `Updated lead "${updatedLead.companyName}"`;

  /* -------------------------------------------------------
     STATUS CHANGE
  ------------------------------------------------------- */

  if (updates.status !== undefined && updates.status !== existingLead.status) {
    activityAction = "STATUS_CHANGED";

    activityDescription = `Changed lead status from "${existingLead.status}" to "${updatedLead.status}"`;
  }

  /* -------------------------------------------------------
     LEAD WON
  ------------------------------------------------------- */

  if (updates.status === "Won" && existingLead.status !== "Won") {
    activityAction = "LEAD_WON";

    activityDescription = `Marked lead "${updatedLead.companyName}" as Won`;
  }

  /* -------------------------------------------------------
     LEAD LOST
  ------------------------------------------------------- */

  if (updates.status === "Lost" && existingLead.status !== "Lost") {
    activityAction = "LEAD_LOST";

    activityDescription = `Marked lead "${updatedLead.companyName}" as Lost${
      updatedLead.lostReason ? ` — Reason: ${updatedLead.lostReason}` : ""
    }`;
  }

  /* -------------------------------------------------------
     COMMISSION PAID
  ------------------------------------------------------- */

  if (
    updates.commissionStatus === "Paid" &&
    existingLead.commissionStatus !== "Paid"
  ) {
    activityAction = "COMMISSION_PAID";

    activityDescription = `Marked commission as Paid for lead "${updatedLead.companyName}"`;
  }

  /* -------------------------------------------------------
     CLIENT CONVERSION
  ------------------------------------------------------- */

  if (
    updates.convertedClientId !== undefined &&
    updates.convertedClientId !== existingLead.convertedClientId
  ) {
    activityAction = "CLIENT_CONVERTED";

    activityDescription = `Converted lead "${updatedLead.companyName}" to client "${updatedLead.convertedClientId ?? ""}"`;
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

      convertedClientId: existingLead.convertedClientId,

      convertedAt: existingLead.convertedAt,

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

      convertedClientId: updatedLead.convertedClientId,

      convertedAt: updatedLead.convertedAt,

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

  return updateLead(id, {
    commissionApplicable,

    commissionPercent,

    commissionAmount,

    commissionStatus: commissionApplicable ? "Pending" : "Not Applicable",
  });
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
  /*
   * IMPORTANT:
   *
   * Won does NOT mean converted to client.
   *
   * Therefore convertedAt is NOT set here.
   *
   * Actual conversion happens in AddClient.tsx:
   *
   * 1. Create Client
   * 2. Get real Supabase clients.id
   * 3. Update Lead converted_client_id
   * 4. Set converted_at
   */

  return updateLead(id, {
    status: "Won",
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
   * Existing application behavior archives the lead
   * by marking it Lost with reason "Archived".
   *
   * A dedicated archived column can be introduced later
   * if the Leads database schema supports it.
   */

  const lead = await getLead(id);

  if (!lead) {
    return false;
  }

  const databaseId = Number(String(id).replace("LEAD-", ""));

  if (!Number.isFinite(databaseId)) {
    return false;
  }

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

  const archivedRow = data as LeadRow;

  let archivedConvertedClientId: string | undefined;

  if (archivedRow.converted_client_id !== null) {
    archivedConvertedClientId =
      (await getCrmClientIdBySupabaseClientId(
        Number(archivedRow.converted_client_id),
      )) ?? undefined;
  }

  const archivedLead = toLead(archivedRow, archivedConvertedClientId);

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
