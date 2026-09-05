import { supabase } from "../lib/supabase";
import { getClientById } from "./clientStore";

export type FollowUpStatus = "Pending" | "Completed";

export type FollowUpPriority = "High" | "Medium" | "Low";

export type FollowUpRelatedType = "Lead" | "Client" | "Quotation" | "Renewal";

export type FollowUp = {
  id: string;

  relatedType?: FollowUpRelatedType;
  relatedId?: string;
  relatedName?: string;

  clientId: string;
  clientName: string;
  contactPerson: string;
  phone: string;

  purpose: string;
  followUpType: string;

  followUpDate: string;
  followUpTime: string;

  priority: FollowUpPriority;

  assignedTo: string;

  reminder: string;

  nextFollowUpDate: string;
  nextFollowUpTime: string;

  nextAction: string;

  notes: string;
  clientResponse: string;
  internalNotes: string;

  status: FollowUpStatus;

  completedAt?: string;

  createdAt: string;
};

type FollowUpRow = {
  id: number;
  lead_id: number | null;
  client_id: number | null;
  assigned_to_id: number | null;

  follow_up_date: string;
  follow_up_time: string | null;

  type: string;
  subject: string | null;

  notes: string | null;
  outcome: string | null;
  next_action: string | null;

  next_follow_up_date: string | null;

  status: string;
  priority: string;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  completed_at: string | null;
};

type ClientRow = {
  id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
};

type LeadRow = {
  id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
};

type SalesPersonRow = {
  id: number;
  name: string;
};

/* =========================================================
   ACTIVITY LOG
========================================================= */

async function logActivity({
  action,
  module,
  recordId,
  recordName,
  description,
  oldData,
  newData,
}: {
  action: string;
  module: string;
  recordId: string;
  recordName?: string;
  description: string;
  oldData?: unknown;
  newData?: unknown;
}) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      action,
      module,
      record_id: recordId,
      record_name: recordName || "",
      description,
      old_data: oldData ?? null,
      new_data: newData ?? null,
    });

    if (error) {
      console.error("Follow-up activity log error:", error);
    }
  } catch (error) {
    console.error("Follow-up activity log exception:", error);
  }
}

/* =========================================================
   DISPLAY ID HELPERS
========================================================= */

function getDatabaseId(
  displayId: string | undefined,
  prefix: string,
): number | null {
  if (!displayId) {
    return null;
  }

  const match = displayId.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id) ? id : null;
}

function formatId(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(3, "0")}`;
}

function getFollowUpDatabaseId(displayId: string): number | null {
  return getDatabaseId(displayId, "FU");
}

function getLeadDatabaseId(displayId: string | undefined): number | null {
  return getDatabaseId(displayId, "LEAD");
}

function getSalesPersonDatabaseId(displayId: string): number | null {
  return getDatabaseId(displayId, "SP");
}

/* =========================================================
   CLIENT RESOLUTION
   IMPORTANT:
   Local CL-001 / CL-002 etc. are NOT Supabase IDs.
========================================================= */

async function resolveClientDatabaseId(
  clientDisplayId: string | undefined,
  clientName?: string,
): Promise<number | null> {
  /*
   * 1. First try the company name.
   *
   * We ONLY consider active/non-archived clients.
   * This avoids duplicate archived records.
   */
  if (clientName?.trim()) {
    const cleanName = clientName.trim();

    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name")
      .eq("company_name", cleanName)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Client company-name lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  /*
   * 2. If company name didn't work, try the local
   * client display ID only when that numeric ID
   * actually exists in Supabase.
   */
  const numericId = getDatabaseId(clientDisplayId, "CL");

  if (numericId !== null) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("id", numericId)
      .eq("is_archived", false)
      .maybeSingle();

    if (error) {
      console.error("Client numeric ID lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  /*
   * 3. Final fallback:
   * Read the local client using its CL-xxx ID,
   * then search Supabase using its company name.
   *
   * This handles cases such as:
   * Local CL-004 -> Onyx
   * Supabase ID 7 -> Onyx
   */
  if (clientDisplayId) {
    const localClient = getClientById(clientDisplayId);

    if (localClient?.company?.trim()) {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("company_name", localClient.company.trim())
        .eq("is_archived", false)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Client local-ID fallback lookup error:", error);
      }

      if (data) {
        return Number(data.id);
      }
    }
  }

  return null;
}

/* =========================================================
   LEAD RESOLUTION
========================================================= */

async function resolveLeadDatabaseId(
  leadDisplayId: string | undefined,
  leadName?: string,
): Promise<number | null> {
  /*
   * First search by company name.
   */
  if (leadName?.trim()) {
    const cleanName = leadName.trim();

    const { data, error } = await supabase
      .from("leads")
      .select("id, company_name")
      .eq("company_name", cleanName)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Lead company-name lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  /*
   * Fallback to LEAD-xxx numeric ID.
   */
  const numericId = getLeadDatabaseId(leadDisplayId);

  if (numericId !== null) {
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("Lead numeric ID lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  return null;
}

/* =========================================================
   SALES PERSON RESOLUTION
========================================================= */

async function resolveSalesPersonDatabaseId(
  displayId: string | undefined,
  name?: string,
): Promise<number | null> {
  /*
   * First try salesperson name.
   */
  if (name?.trim()) {
    const cleanName = name.trim();

    const { data, error } = await supabase
      .from("sales_persons")
      .select("id, name")
      .eq("name", cleanName)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Sales person name lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  /*
   * Fallback to SP-xxx numeric ID.
   */
  const numericId = getSalesPersonDatabaseId(displayId || "");

  if (numericId !== null) {
    const { data, error } = await supabase
      .from("sales_persons")
      .select("id")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("Sales person numeric ID lookup error:", error);
    }

    if (data) {
      return Number(data.id);
    }
  }

  return null;
}

/* =========================================================
   VALIDATION
========================================================= */

function normalizeStatus(value: string): FollowUpStatus {
  return value === "Completed" ? "Completed" : "Pending";
}

function normalizePriority(value: string): FollowUpPriority {
  if (value === "High" || value === "Low") {
    return value;
  }

  return "Medium";
}

/* =========================================================
   RELATED RECORD HELPERS
========================================================= */

async function getClientInfo(
  clientId: number | null,
): Promise<ClientRow | null> {
  if (clientId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, contact_person, phone")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("Follow-up client lookup error:", error);

    return null;
  }

  return data as ClientRow | null;
}

async function getLeadInfo(leadId: number | null): Promise<LeadRow | null> {
  if (leadId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id, company_name, contact_person, phone")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    console.error("Follow-up lead lookup error:", error);

    return null;
  }

  return data as LeadRow | null;
}

async function getSalesPersonInfo(
  salesPersonId: number | null,
): Promise<SalesPersonRow | null> {
  if (salesPersonId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .select("id, name")
    .eq("id", salesPersonId)
    .maybeSingle();

  if (error) {
    console.error("Follow-up sales person lookup error:", error);

    return null;
  }

  return data as SalesPersonRow | null;
}

/* =========================================================
   MAP DATABASE ROW
========================================================= */

async function mapFollowUp(row: FollowUpRow): Promise<FollowUp> {
  const [client, lead, salesPerson] = await Promise.all([
    getClientInfo(row.client_id),
    getLeadInfo(row.lead_id),
    getSalesPersonInfo(row.assigned_to_id),
  ]);

  let relatedType: FollowUpRelatedType | undefined;
  let relatedId: string | undefined;
  let relatedName: string | undefined;

  if (row.lead_id !== null) {
    relatedType = "Lead";
    relatedId = formatId("LEAD", row.lead_id);
    relatedName = lead?.company_name;
  } else if (row.client_id !== null) {
    relatedType = "Client";
    relatedId = formatId("CL", row.client_id);
    relatedName = client?.company_name;
  }

  return {
    id: formatId("FU", row.id),

    relatedType,
    relatedId,
    relatedName,

    clientId: row.client_id !== null ? formatId("CL", row.client_id) : "",

    clientName: client?.company_name || lead?.company_name || relatedName || "",

    contactPerson: client?.contact_person || lead?.contact_person || "",

    phone: client?.phone || lead?.phone || "",

    purpose: row.subject ?? "",

    followUpType: row.type,

    followUpDate: row.follow_up_date,

    followUpTime: row.follow_up_time ?? "",

    priority: normalizePriority(row.priority),

    assignedTo: salesPerson ? formatId("SP", salesPerson.id) : "",

    reminder: "",

    nextFollowUpDate: row.next_follow_up_date ?? "",

    nextFollowUpTime: "",

    nextAction: row.next_action ?? "",

    notes: row.notes ?? "",

    clientResponse: row.outcome ?? "",

    internalNotes: "",

    status: normalizeStatus(row.status),

    completedAt: row.completed_at ?? undefined,

    createdAt: row.created_at,
  };
}

/* =========================================================
   GET ALL
========================================================= */

export async function getFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .order("follow_up_date", {
      ascending: true,
    })
    .order("follow_up_time", {
      ascending: true,
    });

  if (error) {
    console.error("Supabase follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}

/* =========================================================
   GET SINGLE
========================================================= */

export async function getFollowUp(id: string): Promise<FollowUp | null> {
  const databaseId = getFollowUpDatabaseId(id);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Supabase follow-up error:", error);

    return null;
  }

  if (!data) {
    return null;
  }

  return mapFollowUp(data as FollowUpRow);
}

/* =========================================================
   GENERATE ID
========================================================= */

export async function generateFollowUpId(): Promise<string> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("id")
    .order("id", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return "FU-001";
  }

  return formatId("FU", Number(data.id) + 1);
}

/* =========================================================
   ADD FOLLOW-UP
========================================================= */

export async function addFollowUp(
  followUp: FollowUp,
): Promise<FollowUp | null> {
  /*
   * Resolve actual Supabase client ID.
   */
  const clientId =
    followUp.relatedType === "Client"
      ? await resolveClientDatabaseId(followUp.clientId, followUp.clientName)
      : null;

  /*
   * Resolve actual Supabase lead ID.
   */
  const leadId =
    followUp.relatedType === "Lead"
      ? await resolveLeadDatabaseId(
          followUp.relatedId,
          followUp.relatedName || followUp.clientName,
        )
      : null;

  /*
   * Resolve salesperson.
   */
  const assignedToId = await resolveSalesPersonDatabaseId(followUp.assignedTo);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* -------------------------------------------------------
     VALIDATION
  ------------------------------------------------------- */

  if (followUp.relatedType === "Client" && clientId === null) {
    throw new Error(
      `Client "${followUp.clientName}" was not found in the database.`,
    );
  }

  if (followUp.relatedType === "Lead" && leadId === null) {
    throw new Error(
      `Lead "${
        followUp.relatedName || followUp.clientName
      }" was not found in the database.`,
    );
  }

  /* -------------------------------------------------------
     INSERT
  ------------------------------------------------------- */

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      lead_id: followUp.relatedType === "Lead" ? leadId : null,

      client_id: followUp.relatedType === "Client" ? clientId : null,

      assigned_to_id: assignedToId,

      follow_up_date: followUp.followUpDate,

      follow_up_time: followUp.followUpTime || null,

      type: followUp.followUpType || "General",

      subject: followUp.purpose || null,

      notes: followUp.notes || null,

      outcome: followUp.clientResponse || null,

      next_action: followUp.nextAction || null,

      next_follow_up_date: followUp.nextFollowUpDate || null,

      status: followUp.status,

      priority: followUp.priority,

      created_by: user?.id ?? null,

      completed_at: followUp.completedAt || null,

      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Add follow-up error:", error);

    throw error;
  }

  const createdFollowUp = await mapFollowUp(data as FollowUpRow);

  /* -------------------------------------------------------
     ACTIVITY LOG
  ------------------------------------------------------- */

  await logActivity({
    action: "CREATE",
    module: "Follow-ups",
    recordId: createdFollowUp.id,
    recordName:
      createdFollowUp.clientName ||
      createdFollowUp.relatedName ||
      createdFollowUp.id,

    description: `Created follow-up for "${
      createdFollowUp.clientName || createdFollowUp.relatedName || "record"
    }"`,

    newData: {
      purpose: createdFollowUp.purpose,

      followUpType: createdFollowUp.followUpType,

      followUpDate: createdFollowUp.followUpDate,

      followUpTime: createdFollowUp.followUpTime,

      priority: createdFollowUp.priority,

      assignedTo: createdFollowUp.assignedTo,

      status: createdFollowUp.status,
    },
  });

  return createdFollowUp;
}

/* =========================================================
   INTERNAL UPDATE
========================================================= */

async function updateFollowUpInternal(
  id: string,
  updates: Partial<FollowUp>,
  activityAction: string,
  activityDescription: string,
): Promise<FollowUp | null> {
  const databaseId = getFollowUpDatabaseId(id);

  if (databaseId === null) {
    return null;
  }

  const existing = await getFollowUp(id);

  const databaseUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  /* -------------------------------------------------------
     CLIENT
  ------------------------------------------------------- */

  if (updates.clientId !== undefined) {
    const resolvedClientId = await resolveClientDatabaseId(
      updates.clientId,
      updates.clientName || existing?.clientName,
    );

    if (updates.relatedType === "Client" && resolvedClientId === null) {
      throw new Error(
        `Client "${
          updates.clientName || existing?.clientName || ""
        }" was not found in the database.`,
      );
    }

    databaseUpdates.client_id = resolvedClientId;
  }

  /* -------------------------------------------------------
     LEAD
  ------------------------------------------------------- */

  if (updates.relatedType === "Lead" && updates.relatedId !== undefined) {
    const resolvedLeadId = await resolveLeadDatabaseId(
      updates.relatedId,
      updates.relatedName ||
        updates.clientName ||
        existing?.relatedName ||
        existing?.clientName,
    );

    if (resolvedLeadId === null) {
      throw new Error(
        `Lead "${
          updates.relatedName ||
          updates.clientName ||
          existing?.relatedName ||
          existing?.clientName ||
          ""
        }" was not found in the database.`,
      );
    }

    databaseUpdates.lead_id = resolvedLeadId;

    databaseUpdates.client_id = null;
  }

  /* -------------------------------------------------------
     ASSIGNED TO
  ------------------------------------------------------- */

  if (updates.assignedTo !== undefined) {
    databaseUpdates.assigned_to_id = await resolveSalesPersonDatabaseId(
      updates.assignedTo,
    );
  }

  /* -------------------------------------------------------
     OTHER FIELDS
  ------------------------------------------------------- */

  if (updates.followUpDate !== undefined) {
    databaseUpdates.follow_up_date = updates.followUpDate;
  }

  if (updates.followUpTime !== undefined) {
    databaseUpdates.follow_up_time = updates.followUpTime || null;
  }

  if (updates.followUpType !== undefined) {
    databaseUpdates.type = updates.followUpType;
  }

  if (updates.purpose !== undefined) {
    databaseUpdates.subject = updates.purpose || null;
  }

  if (updates.notes !== undefined) {
    databaseUpdates.notes = updates.notes || null;
  }

  if (updates.clientResponse !== undefined) {
    databaseUpdates.outcome = updates.clientResponse || null;
  }

  if (updates.nextAction !== undefined) {
    databaseUpdates.next_action = updates.nextAction || null;
  }

  if (updates.nextFollowUpDate !== undefined) {
    databaseUpdates.next_follow_up_date = updates.nextFollowUpDate || null;
  }

  if (updates.priority !== undefined) {
    databaseUpdates.priority = updates.priority;
  }

  if (updates.status !== undefined) {
    databaseUpdates.status = updates.status;
  }

  if (updates.completedAt !== undefined) {
    databaseUpdates.completed_at = updates.completedAt || null;
  }

  /* -------------------------------------------------------
     UPDATE DATABASE
  ------------------------------------------------------- */

  const { data, error } = await supabase
    .from("follow_ups")
    .update(databaseUpdates)
    .eq("id", databaseId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Update follow-up error:", error);

    throw error;
  }

  if (!data) {
    return null;
  }

  const updatedFollowUp = await mapFollowUp(data as FollowUpRow);

  /* -------------------------------------------------------
     ACTIVITY LOG
  ------------------------------------------------------- */

  await logActivity({
    action: activityAction,
    module: "Follow-ups",

    recordId: updatedFollowUp.id,

    recordName:
      updatedFollowUp.clientName ||
      updatedFollowUp.relatedName ||
      updatedFollowUp.id,

    description: activityDescription,

    oldData: existing
      ? {
          status: existing.status,

          purpose: existing.purpose,

          followUpDate: existing.followUpDate,

          followUpTime: existing.followUpTime,

          priority: existing.priority,

          assignedTo: existing.assignedTo,

          notes: existing.notes,
        }
      : undefined,

    newData: {
      status: updatedFollowUp.status,

      purpose: updatedFollowUp.purpose,

      followUpDate: updatedFollowUp.followUpDate,

      followUpTime: updatedFollowUp.followUpTime,

      priority: updatedFollowUp.priority,

      assignedTo: updatedFollowUp.assignedTo,

      notes: updatedFollowUp.notes,
    },
  });

  return updatedFollowUp;
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateFollowUp(
  id: string,
  updates: Partial<FollowUp>,
): Promise<FollowUp | null> {
  return updateFollowUpInternal(
    id,
    updates,
    "UPDATE",
    `Updated follow-up ${id}`,
  );
}

/* =========================================================
   COMPLETE
========================================================= */

export async function completeFollowUp(id: string): Promise<FollowUp | null> {
  return updateFollowUpInternal(
    id,
    {
      status: "Completed",
      completedAt: new Date().toISOString(),
    },
    "FOLLOW_UP_COMPLETED",
    `Completed follow-up ${id}`,
  );
}

/* =========================================================
   REOPEN
========================================================= */

export async function reopenFollowUp(id: string): Promise<FollowUp | null> {
  return updateFollowUpInternal(
    id,
    {
      status: "Pending",
      completedAt: "",
    },
    "UPDATE",
    `Reopened follow-up ${id}`,
  );
}

/* =========================================================
   ARCHIVE
========================================================= */

export async function deleteFollowUp(id: string): Promise<boolean> {
  const updated = await updateFollowUpInternal(
    id,
    {
      status: "Completed",
      completedAt: new Date().toISOString(),
      clientResponse: "Archived",
    },
    "ARCHIVE",
    `Archived follow-up ${id}`,
  );

  return updated !== null;
}

/* =========================================================
   GET BY RELATED RECORD
========================================================= */

export async function getFollowUpsByRelatedRecord(
  relatedType: FollowUpRelatedType,
  relatedId: string,
): Promise<FollowUp[]> {
  let query = supabase.from("follow_ups").select("*");

  /* -------------------------------------------------------
     LEAD
  ------------------------------------------------------- */

  if (relatedType === "Lead") {
    const databaseId = await resolveLeadDatabaseId(relatedId);

    if (databaseId === null) {
      return [];
    }

    query = query.eq("lead_id", databaseId);
  } else if (relatedType === "Client") {

  /* -------------------------------------------------------
     CLIENT
     IMPORTANT:
     CL-004 is NOT necessarily Supabase ID 4.
  ------------------------------------------------------- */
    let databaseId: number | null = null;

    /*
     * First resolve through local client
     * so CL-004 -> Onyx -> Supabase ID 7.
     */
    const localClient = getClientById(relatedId);

    if (localClient) {
      databaseId = await resolveClientDatabaseId(
        relatedId,
        localClient.company,
      );
    } else {
      /*
       * If relatedId isn't a local CL-xxx ID,
       * try it as a numeric DB ID.
       */
      databaseId = await resolveClientDatabaseId(relatedId);
    }

    if (databaseId === null) {
      return [];
    }

    query = query.eq("client_id", databaseId);
  } else {

  /* -------------------------------------------------------
     QUOTATION / RENEWAL
  ------------------------------------------------------- */
    return [];
  }

  const { data, error } = await query.order("follow_up_date", {
    ascending: true,
  });

  if (error) {
    console.error("Related follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}

/* =========================================================
   LEAD FOLLOW-UPS
========================================================= */

export async function getLeadFollowUps(leadId: string): Promise<FollowUp[]> {
  return getFollowUpsByRelatedRecord("Lead", leadId);
}

/* =========================================================
   CLIENT FOLLOW-UPS
========================================================= */

export async function getClientFollowUps(
  clientId: string,
): Promise<FollowUp[]> {
  return getFollowUpsByRelatedRecord("Client", clientId);
}

/* =========================================================
   QUOTATION FOLLOW-UPS
========================================================= */

export async function getQuotationFollowUps(
  quotationId: string,
): Promise<FollowUp[]> {
  void quotationId;
  return [];
}

/* =========================================================
   RENEWAL FOLLOW-UPS
========================================================= */

export async function getRenewalFollowUps(
  renewalId: string,
): Promise<FollowUp[]> {
  void renewalId;
  return [];
}

/* =========================================================
   PENDING
========================================================= */

export async function getPendingFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("status", "Pending")
    .order("follow_up_date", {
      ascending: true,
    });

  if (error) {
    console.error("Pending follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}

/* =========================================================
   COMPLETED
========================================================= */

export async function getCompletedFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("status", "Completed")
    .order("follow_up_date", {
      ascending: false,
    });

  if (error) {
    console.error("Completed follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}

/* =========================================================
   TODAY
========================================================= */

export async function getTodayFollowUps(): Promise<FollowUp[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("follow_up_date", today)
    .eq("status", "Pending")
    .order("follow_up_time", {
      ascending: true,
    });

  if (error) {
    console.error("Today's follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}

/* =========================================================
   OVERDUE
========================================================= */

export async function getOverdueFollowUps(): Promise<FollowUp[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .lt("follow_up_date", today)
    .eq("status", "Pending")
    .order("follow_up_date", {
      ascending: true,
    });

  if (error) {
    console.error("Overdue follow-ups error:", error);

    return [];
  }

  return Promise.all(((data ?? []) as FollowUpRow[]).map(mapFollowUp));
}
