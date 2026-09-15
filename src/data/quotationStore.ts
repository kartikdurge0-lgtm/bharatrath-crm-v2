/* =========================================================
   QUOTATION STORE
   Bharatrath CRM

   PHASE 2 — SUPABASE SOURCE OF TRUTH

   Rules:
   1. Quotations are never permanently deleted.
   2. Archived quotations remain in Supabase history.
   3. Active quotation reads exclude archived records.
   4. Quotation numbers are immutable after creation.
   5. Totals are recalculated by the store before every write.
   6. Frontend CRM IDs (QT-xxx / CL-xxx / LEAD-xxx / SP-xxx)
      are display IDs. Supabase relationships use numeric IDs.
   7. LocalStorage is NOT used for quotation business data.

   IMPORTANT DB PREREQUISITE:
   The current Supabase schema must contain:
     quotations.is_archived boolean
     quotations.archived_at timestamptz

   These columns are required for archive-only deletion.
========================================================= */

import { supabase } from "../lib/supabase";
import { createActivityLog } from "./activityLogStore";

/* =========================================================
   TYPES
========================================================= */

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired";

export type QuotationItem = {
  serviceId: string;
  description: string;
  sac: string;
  basicCost: number;
  discountedCost: number;
  finalCost: number;
  frequency: string;
};

export type Quotation = {
  id: string;

  leadId?: string;

  clientId: string;
  clientName: string;

  salesPersonId?: string;
  salesPersonName?: string;

  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  status: QuotationStatus;

  items: QuotationItem[];

  tax: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;

  scopeOfWork: string;
  implementationProcess: string;
  supportTraining: string;
  remarks: string;
  termsConditions: string;

  createdAt: string;
  updatedAt?: string;

  isArchived?: boolean;
  archivedAt?: string;
};

/* =========================================================
   DATABASE ROW TYPES
========================================================= */

type QuotationRow = {
  id: number;
  client_id: number;
  lead_id: number | null;
  sales_person_id: number | null;

  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;

  service_name: string | null;
  items: unknown;

  scope_of_work: string | null;
  remarks: string | null;
  implementation_process: string | null;
  support_training: string | null;

  amount: number | null;
  tax: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  grand_total: number | null;

  terms_conditions: string | null;
  status: string;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  is_archived: boolean | null;
  archived_at: string | null;
};

type ClientRow = {
  id: number;
  crm_client_id: string | null;
  company_name: string | null;
};

type SalesPersonRow = {
  id: number;
  name: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_QUOTATION_PREFIX = "QUO-";

const QUOTATION_ID_PREFIX = "QT";

/* =========================================================
   GENERIC HELPERS
========================================================= */

function normalizeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatDisplayId(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(3, "0")}`;
}

function getDatabaseId(
  displayId: string | undefined,
  prefix: string,
): number | null {
  const value = String(displayId || "").trim();

  if (!value) {
    return null;
  }

  const match = value.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeStatus(value: unknown): QuotationStatus {
  switch (String(value || "")) {
    case "Sent":
      return "Sent";
    case "Accepted":
      return "Accepted";
    case "Rejected":
      return "Rejected";
    case "Expired":
      return "Expired";
    default:
      return "Draft";
  }
}

function quotationRecordName(quotation: Quotation): string {
  return (
    String(quotation.quotationNumber || "").trim() ||
    String(quotation.clientName || "").trim() ||
    String(quotation.id || "").trim()
  );
}

function quotationDescription(quotation: Quotation, action: string): string {
  const name = quotationRecordName(quotation);

  switch (action) {
    case "CREATE":
      return `Created quotation "${name}" for "${quotation.clientName}"`;
    case "UPDATE":
      return `Updated quotation "${name}"`;
    case "STATUS_CHANGED":
      return `Changed quotation "${name}" status`;
    case "ARCHIVE":
      return `Archived quotation "${name}"`;
    case "RESTORE":
      return `Restored quotation "${name}"`;
    default:
      return `${action} quotation "${name}"`;
  }
}

/* =========================================================
   ITEM NORMALIZATION
========================================================= */

function normalizeQuotationItems(items: unknown): QuotationItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((rawItem) => {
    const item = (rawItem || {}) as Partial<QuotationItem> &
      Record<string, unknown>;

    const basicCost = Math.max(
      0,
      normalizeNumber(item.basicCost ?? item.basic_cost),
    );

    const discountedCost = Math.min(
      basicCost,
      Math.max(0, normalizeNumber(item.discountedCost ?? item.discounted_cost)),
    );

    let finalCost = normalizeNumber(item.finalCost ?? item.final_cost);

    /*
     * Backward-compatible pricing rule:
     * finalCost → discountedCost → basicCost
     */
    if (finalCost <= 0) {
      finalCost = discountedCost > 0 ? discountedCost : basicCost;
    }

    return {
      serviceId: String(item.serviceId ?? item.service_id ?? ""),
      description: String(item.description || ""),
      sac: String(item.sac || ""),
      basicCost,
      discountedCost,
      finalCost: Math.max(0, finalCost),
      frequency: String(item.frequency || ""),
    };
  });
}

/* =========================================================
   TOTAL CALCULATION
========================================================= */

export function calculateQuotationTotals(items: QuotationItem[], tax: number) {
  const normalizedItems = normalizeQuotationItems(items);

  const subtotal = normalizedItems.reduce(
    (total, item) => total + normalizeNumber(item.finalCost),
    0,
  );

  const taxRate = Math.max(0, normalizeNumber(tax));

  const taxAmount = (subtotal * taxRate) / 100;

  const grandTotal = subtotal + taxAmount;

  return {
    subtotal,
    taxAmount,
    grandTotal,
  };
}

/* =========================================================
   RELATION RESOLUTION
========================================================= */

async function resolveClientDatabaseId(
  clientDisplayId: string | undefined,
  clientName?: string,
): Promise<number | null> {
  /* -------------------------------------------------------
     1. BEST: crm_client_id
  ------------------------------------------------------- */
  if (clientDisplayId?.trim()) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("crm_client_id", clientDisplayId.trim())
      .eq("is_archived", false)
      .maybeSingle();

    if (error) {
      console.error("Quotation client CRM ID lookup error:", error);
      throw error;
    }

    if (data) {
      return Number(data.id);
    }
  }

  /* -------------------------------------------------------
     2. Safe company-name fallback
     Only exactly one active client is accepted.
  ------------------------------------------------------- */
  if (clientName?.trim()) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, crm_client_id, company_name")
      .eq("company_name", clientName.trim())
      .eq("is_archived", false)
      .limit(2);

    if (error) {
      console.error("Quotation client name lookup error:", error);
      throw error;
    }

    if (data?.length === 1) {
      return Number(data[0].id);
    }

    if ((data?.length || 0) > 1) {
      throw new Error(
        `Multiple active clients found for "${clientName}". Please select the correct client.`,
      );
    }
  }

  /* -------------------------------------------------------
     3. Legacy CL-xxx numeric fallback
  ------------------------------------------------------- */
  const numericId = getDatabaseId(clientDisplayId, "CL");

  if (numericId !== null) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("id", numericId)
      .eq("is_archived", false)
      .maybeSingle();

    if (error) {
      console.error("Quotation client numeric lookup error:", error);
      throw error;
    }

    if (data) {
      return Number(data.id);
    }
  }

  return null;
}

async function resolveLeadDatabaseId(
  leadDisplayId?: string,
): Promise<number | null> {
  const numericId = getDatabaseId(leadDisplayId, "LEAD");

  if (numericId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("id", numericId)
    .maybeSingle();

  if (error) {
    console.error("Quotation lead lookup error:", error);
    throw error;
  }

  return data ? Number(data.id) : null;
}

async function resolveSalesPersonDatabaseId(
  displayId?: string,
  name?: string,
): Promise<number | null> {
  const numericId = getDatabaseId(displayId, "SP");

  if (numericId !== null) {
    const { data, error } = await supabase
      .from("sales_persons")
      .select("id")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("Quotation salesperson ID lookup error:", error);
      throw error;
    }

    if (data) {
      return Number(data.id);
    }
  }

  if (name?.trim()) {
    const { data, error } = await supabase
      .from("sales_persons")
      .select("id, name")
      .eq("name", name.trim())
      .limit(2);

    if (error) {
      console.error("Quotation salesperson name lookup error:", error);
      throw error;
    }

    if (data?.length === 1) {
      return Number(data[0].id);
    }

    if ((data?.length || 0) > 1) {
      throw new Error(
        `Multiple sales persons found for "${name}". Please select the correct person.`,
      );
    }
  }

  return null;
}

/* =========================================================
   BATCH RELATED DATA
========================================================= */

async function loadRelatedMaps(rows: QuotationRow[]) {
  const clientIds = Array.from(
    new Set(
      rows
        .map((row) => row.client_id)
        .filter((id): id is number => Number.isFinite(id)),
    ),
  );

  const salesPersonIds = Array.from(
    new Set(
      rows
        .map((row) => row.sales_person_id)
        .filter((id): id is number => id !== null),
    ),
  );

  const clientPromise =
    clientIds.length > 0
      ? supabase
          .from("clients")
          .select("id, crm_client_id, company_name")
          .in("id", clientIds)
      : Promise.resolve({ data: [], error: null });

  const salesPersonPromise =
    salesPersonIds.length > 0
      ? supabase
          .from("sales_persons")
          .select("id, name")
          .in("id", salesPersonIds)
      : Promise.resolve({ data: [], error: null });

  const [clientsResult, salesResult] = await Promise.all([
    clientPromise,
    salesPersonPromise,
  ]);

  if (clientsResult.error) {
    throw clientsResult.error;
  }

  if (salesResult.error) {
    throw salesResult.error;
  }

  const clientMap = new Map<number, ClientRow>();
  const salesMap = new Map<number, SalesPersonRow>();

  for (const row of (clientsResult.data || []) as ClientRow[]) {
    clientMap.set(Number(row.id), row);
  }

  for (const row of (salesResult.data || []) as SalesPersonRow[]) {
    salesMap.set(Number(row.id), row);
  }

  return {
    clientMap,
    salesMap,
  };
}

/* =========================================================
   DATABASE ROW → FRONTEND MODEL
========================================================= */

function mapQuotationRow(
  row: QuotationRow,
  clientMap: Map<number, ClientRow>,
  salesMap: Map<number, SalesPersonRow>,
): Quotation {
  const client = clientMap.get(Number(row.client_id));
  const salesPerson =
    row.sales_person_id !== null
      ? salesMap.get(Number(row.sales_person_id))
      : undefined;

  const items = normalizeQuotationItems(row.items);
  const tax = Math.max(0, normalizeNumber(row.tax));
  const totals = calculateQuotationTotals(items, tax);

  return {
    id: formatDisplayId(QUOTATION_ID_PREFIX, Number(row.id)),

    leadId:
      row.lead_id !== null
        ? formatDisplayId("LEAD", Number(row.lead_id))
        : undefined,

    clientId:
      client?.crm_client_id || formatDisplayId("CL", Number(row.client_id)),

    clientName: client?.company_name || "",

    salesPersonId:
      row.sales_person_id !== null
        ? formatDisplayId("SP", Number(row.sales_person_id))
        : undefined,

    salesPersonName: salesPerson?.name || undefined,

    quotationNumber: String(row.quotation_number || ""),

    quotationDate: String(row.quotation_date || "").slice(0, 10),

    validUntil: row.valid_until ? String(row.valid_until).slice(0, 10) : "",

    status: normalizeStatus(row.status),

    items,

    tax,

    /*
     * Store-calculated totals are authoritative.
     * DB values are retained only as legacy compatibility.
     */
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    grandTotal: totals.grandTotal,

    scopeOfWork: String(row.scope_of_work || ""),
    implementationProcess: String(row.implementation_process || ""),
    supportTraining: String(row.support_training || ""),
    remarks: String(row.remarks || ""),
    termsConditions: String(row.terms_conditions || ""),

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    isArchived: row.is_archived === true,
    archivedAt: row.archived_at || undefined,
  };
}

/* =========================================================
   GET ALL QUOTATIONS
   ---------------------------------------------------------
   Includes archived records.
   Used for history and number generation.
========================================================= */

export async function getQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load quotations:", error);
    throw error;
  }

  const rows = (data || []) as QuotationRow[];

  if (rows.length === 0) {
    return [];
  }

  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

/* =========================================================
   GET SINGLE ACTIVE QUOTATION
========================================================= */

export async function getQuotation(id: string): Promise<Quotation | null> {
  const databaseId = getDatabaseId(id, QUOTATION_ID_PREFIX);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", databaseId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    console.error("Failed to load quotation:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as QuotationRow;
  const maps = await loadRelatedMaps([row]);

  return mapQuotationRow(row, maps.clientMap, maps.salesMap);
}

/* =========================================================
   GET SINGLE QUOTATION INCLUDING ARCHIVED
========================================================= */

export async function getQuotationIncludingArchived(
  id: string,
): Promise<Quotation | null> {
  const databaseId = getDatabaseId(id, QUOTATION_ID_PREFIX);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load quotation history record:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as QuotationRow;
  const maps = await loadRelatedMaps([row]);

  return mapQuotationRow(row, maps.clientMap, maps.salesMap);
}

/* =========================================================
   GENERATE INTERNAL QUOTATION ID
   ---------------------------------------------------------
   Database identity is the real ID source.

   This function exists for UI compatibility only.
========================================================= */

export async function generateQuotationId(): Promise<string> {
  const { data, error } = await supabase
    .from("quotations")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to generate quotation ID:", error);
    throw error;
  }

  const highestId = data ? Number(data.id) : 0;

  return formatDisplayId(QUOTATION_ID_PREFIX, highestId + 1);
}

/* =========================================================
   GENERATE QUOTATION NUMBER
   ---------------------------------------------------------
   Current format:
   QUO-001
   QUO-002
   ...

   Archived records are included so numbers are never reused.
========================================================= */

export async function generateQuotationNumber(): Promise<string> {
  const { data, error } = await supabase
    .from("quotations")
    .select("quotation_number");

  if (error) {
    console.error("Failed to generate quotation number:", error);
    throw error;
  }

  let highestNumber = 0;

  for (const row of data || []) {
    const value = String(row.quotation_number || "").trim();

    const match = value.match(/^QUO-(\d+)$/i);

    if (!match) {
      continue;
    }

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      highestNumber = Math.max(highestNumber, number);
    }
  }

  return `${DEFAULT_QUOTATION_PREFIX}${String(highestNumber + 1).padStart(
    3,
    "0",
  )}`;
}

export function getQuotationNumberPrefix(): string {
  return DEFAULT_QUOTATION_PREFIX;
}

/* =========================================================
   ENSURE UNIQUE QUOTATION NUMBER
========================================================= */

async function ensureUniqueQuotationNumber(
  requestedNumber?: string,
  ignoredDatabaseId?: number,
): Promise<string> {
  const requested = String(requestedNumber || "").trim();

  if (requested) {
    let query = supabase
      .from("quotations")
      .select("id")
      .ilike("quotation_number", requested)
      .limit(2);

    if (ignoredDatabaseId !== undefined) {
      query = query.neq("id", ignoredDatabaseId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return requested;
    }
  }

  return generateQuotationNumber();
}

/* =========================================================
   BUILD DATABASE PAYLOAD
========================================================= */

async function buildQuotationPayload(
  quotation: Quotation,
  ignoredDatabaseId?: number,
) {
  const clientDatabaseId = await resolveClientDatabaseId(
    quotation.clientId,
    quotation.clientName,
  );

  if (clientDatabaseId === null) {
    throw new Error(
      `Client "${quotation.clientName || quotation.clientId}" was not found in Supabase.`,
    );
  }

  const leadDatabaseId = await resolveLeadDatabaseId(quotation.leadId);

  const salesPersonDatabaseId = await resolveSalesPersonDatabaseId(
    quotation.salesPersonId,
    quotation.salesPersonName,
  );

  const items = normalizeQuotationItems(quotation.items);

  if (items.length === 0) {
    throw new Error("Quotation must contain at least one item.");
  }

  const tax = Math.max(0, normalizeNumber(quotation.tax));

  const quotationNumber = await ensureUniqueQuotationNumber(
    quotation.quotationNumber,
    ignoredDatabaseId,
  );

  const serviceName = items[0]?.description?.trim() || "Quotation";

  return {
    client_id: clientDatabaseId,
    lead_id: leadDatabaseId,
    sales_person_id: salesPersonDatabaseId,

    quotation_number: quotationNumber,

    quotation_date:
      quotation.quotationDate || new Date().toISOString().slice(0, 10),

    valid_until: quotation.validUntil || null,

    service_name: serviceName,

    /*
     * Keep JSON items because the existing invoice and quotation
     * UI already consumes this field and the database schema
     * contains the JSON representation.
     */
    items,

    scope_of_work: quotation.scopeOfWork || null,
    remarks: quotation.remarks || null,
    implementation_process: quotation.implementationProcess || null,
    support_training: quotation.supportTraining || null,

    // The current DEV quotations table stores the GST rate.
    // Subtotal / tax amount / grand total are calculated from items in the CRM.
    tax,

    terms_conditions: quotation.termsConditions || null,

    status: normalizeStatus(quotation.status),
  };
}

/* =========================================================
   ADD QUOTATION
========================================================= */

export async function addQuotation(quotation: Quotation): Promise<Quotation> {
  const payload = await buildQuotationPayload(quotation);

  /*
   * ID and created_at are generated by Supabase.
   * The frontend-provided QT ID is intentionally ignored.
   */
  const { data, error } = await supabase
    .from("quotations")
    .insert({
      ...payload,
      is_archived: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create quotation:", error);
    throw error;
  }

  const row = data as QuotationRow;
  const maps = await loadRelatedMaps([row]);

  const createdQuotation = mapQuotationRow(row, maps.clientMap, maps.salesMap);

  void createActivityLog({
    action: "CREATE",
    module: "Quotations",
    record_id: createdQuotation.id,
    record_name: quotationRecordName(createdQuotation),
    description: quotationDescription(createdQuotation, "CREATE"),
    new_data: createdQuotation as unknown as Record<string, unknown>,
  });

  return createdQuotation;
}

/* =========================================================
   UPDATE QUOTATION
========================================================= */

export async function updateQuotation(
  id: string,
  updates: Partial<Quotation>,
): Promise<Quotation | null> {
  const databaseId = getDatabaseId(id, QUOTATION_ID_PREFIX);

  if (databaseId === null) {
    return null;
  }

  const existing = await getQuotation(id);

  if (!existing) {
    return null;
  }

  /*
   * Immutable fields are restored from the existing record.
   */
  const mergedQuotation: Quotation = {
    ...existing,
    ...updates,

    id: existing.id,
    quotationNumber: existing.quotationNumber,

    isArchived: false,
    archivedAt: undefined,
  };

  const payload = await buildQuotationPayload(mergedQuotation, databaseId);

  /*
   * IMPORTANT:
   * We explicitly restore the existing quotation number.
   * ensureUniqueQuotationNumber() is only a safety check.
   */
  payload.quotation_number = existing.quotationNumber;

  const { data, error } = await supabase
    .from("quotations")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", databaseId)
    .eq("is_archived", false)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update quotation:", error);
    throw error;
  }

  const row = data as QuotationRow;
  const maps = await loadRelatedMaps([row]);

  const updatedQuotation = mapQuotationRow(row, maps.clientMap, maps.salesMap);

  const oldData = existing as unknown as Record<string, unknown>;
  const newData = updatedQuotation as unknown as Record<string, unknown>;

  if (existing.status !== updatedQuotation.status) {
    void createActivityLog({
      action: "STATUS_CHANGED",
      module: "Quotations",
      record_id: updatedQuotation.id,
      record_name: quotationRecordName(updatedQuotation),
      description: `Changed quotation "${quotationRecordName(
        updatedQuotation,
      )}" status from "${existing.status}" to "${updatedQuotation.status}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  const changedKeys = Object.keys(updates).filter(
    (key) =>
      key !== "status" &&
      key !== "quotationNumber" &&
      key !== "id" &&
      key !== "createdAt" &&
      key !== "updatedAt" &&
      key !== "isArchived" &&
      key !== "archivedAt",
  );

  if (changedKeys.length > 0) {
    void createActivityLog({
      action: "UPDATE",
      module: "Quotations",
      record_id: updatedQuotation.id,
      record_name: quotationRecordName(updatedQuotation),
      description: quotationDescription(updatedQuotation, "UPDATE"),
      old_data: oldData,
      new_data: newData,
    });
  }

  return updatedQuotation;
}

/* =========================================================
   ARCHIVE QUOTATION
   ---------------------------------------------------------
   Never permanently deletes a quotation.
========================================================= */

export async function deleteQuotation(id: string): Promise<boolean> {
  const databaseId = getDatabaseId(id, QUOTATION_ID_PREFIX);

  if (databaseId === null) {
    return false;
  }

  const quotation = await getQuotation(id);

  if (!quotation) {
    return false;
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("quotations")
    .update({
      is_archived: true,
      updated_at: now,
    })
    .eq("id", databaseId)
    .eq("is_archived", false);

  if (error) {
    console.error("Failed to archive quotation:", error);
    throw error;
  }

  void createActivityLog({
    action: "ARCHIVE",
    module: "Quotations",
    record_id: quotation.id,
    record_name: quotationRecordName(quotation),
    description: quotationDescription(quotation, "ARCHIVE"),
    old_data: quotation as unknown as Record<string, unknown>,
    new_data: {
      ...quotation,
      isArchived: true,
      archivedAt: now,
    } as unknown as Record<string, unknown>,
  });

  return true;
}

/* =========================================================
   RESTORE ARCHIVED QUOTATION
========================================================= */

export async function restoreQuotation(id: string): Promise<Quotation | null> {
  const databaseId = getDatabaseId(id, QUOTATION_ID_PREFIX);

  if (databaseId === null) {
    return null;
  }

  const quotation = await getQuotationIncludingArchived(id);

  if (!quotation || quotation.isArchived !== true) {
    return null;
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("quotations")
    .update({
      is_archived: false,
      updated_at: now,
    })
    .eq("id", databaseId)
    .eq("is_archived", true)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to restore quotation:", error);
    throw error;
  }

  const row = data as QuotationRow;
  const maps = await loadRelatedMaps([row]);

  const restoredQuotation = mapQuotationRow(row, maps.clientMap, maps.salesMap);

  void createActivityLog({
    action: "RESTORE",
    module: "Quotations",
    record_id: restoredQuotation.id,
    record_name: quotationRecordName(restoredQuotation),
    description: quotationDescription(restoredQuotation, "RESTORE"),
    old_data: quotation as unknown as Record<string, unknown>,
    new_data: restoredQuotation as unknown as Record<string, unknown>,
  });

  return restoredQuotation;
}

/* =========================================================
   ARCHIVED QUOTATIONS
========================================================= */

export async function getArchivedQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("is_archived", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load archived quotations:", error);
    throw error;
  }

  const rows = (data || []) as QuotationRow[];

  if (rows.length === 0) {
    return [];
  }

  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

/* =========================================================
   STATUS HELPERS
========================================================= */

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
): Promise<Quotation | null> {
  return updateQuotation(id, { status });
}

export async function markQuotationAsSent(
  id: string,
): Promise<Quotation | null> {
  return updateQuotationStatus(id, "Sent");
}

export async function acceptQuotation(id: string): Promise<Quotation | null> {
  return updateQuotationStatus(id, "Accepted");
}

export async function rejectQuotation(id: string): Promise<Quotation | null> {
  return updateQuotationStatus(id, "Rejected");
}

export async function expireQuotation(id: string): Promise<Quotation | null> {
  return updateQuotationStatus(id, "Expired");
}

/* =========================================================
   DUPLICATE QUOTATION
========================================================= */

export async function duplicateQuotation(
  id: string,
): Promise<Quotation | null> {
  const quotation = await getQuotation(id);

  if (!quotation) {
    return null;
  }

  const quotationNumber = await generateQuotationNumber();
  const now = new Date().toISOString();

  const duplicate: Quotation = {
    ...quotation,

    /*
     * addQuotation() ignores this ID and lets Supabase
     * generate the actual identity.
     */
    id: "",

    quotationNumber,

    quotationDate: now.slice(0, 10),

    status: "Draft",

    isArchived: false,
    archivedAt: undefined,

    createdAt: now,
    updatedAt: now,
  };

  return addQuotation(duplicate);
}

/* =========================================================
   FILTER HELPERS
========================================================= */

export async function getQuotationsByClient(
  clientId: string,
): Promise<Quotation[]> {
  const databaseId = await resolveClientDatabaseId(clientId);

  if (databaseId === null) {
    return [];
  }

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("client_id", databaseId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data || []) as QuotationRow[];
  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

export async function getQuotationsByLead(
  leadId: string,
): Promise<Quotation[]> {
  const databaseId = getDatabaseId(leadId, "LEAD");

  if (databaseId === null) {
    return [];
  }

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("lead_id", databaseId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data || []) as QuotationRow[];
  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

export async function getQuotationsBySalesPerson(
  salesPersonId: string,
): Promise<Quotation[]> {
  const databaseId = getDatabaseId(salesPersonId, "SP");

  if (databaseId === null) {
    return [];
  }

  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("sales_person_id", databaseId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data || []) as QuotationRow[];
  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

export async function getQuotationsByStatus(
  status: QuotationStatus,
): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("status", status)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data || []) as QuotationRow[];
  const maps = await loadRelatedMaps(rows);

  return rows.map((row) => mapQuotationRow(row, maps.clientMap, maps.salesMap));
}

/* =========================================================
   SEARCH ACTIVE QUOTATIONS
========================================================= */

export async function searchQuotations(search: string): Promise<Quotation[]> {
  const query = search.trim().toLowerCase();

  const quotations = await getQuotations();

  const active = quotations.filter(
    (quotation) => quotation.isArchived !== true,
  );

  if (!query) {
    return active;
  }

  return active.filter((quotation) => {
    const fields = [
      quotation.clientName,
      quotation.quotationNumber,
      quotation.status,
      quotation.salesPersonName,
      quotation.id,
      quotation.leadId,
      quotation.items?.[0]?.description,
    ];

    return fields.some((field) =>
      String(field || "")
        .toLowerCase()
        .includes(query),
    );
  });
}

/* =========================================================
   STATISTICS
========================================================= */

export async function getQuotationStats() {
  const quotations = (await getQuotations()).filter(
    (quotation) => quotation.isArchived !== true,
  );

  const total = quotations.length;

  const draft = quotations.filter(
    (quotation) => quotation.status === "Draft",
  ).length;

  const sent = quotations.filter(
    (quotation) => quotation.status === "Sent",
  ).length;

  const accepted = quotations.filter(
    (quotation) => quotation.status === "Accepted",
  ).length;

  const rejected = quotations.filter(
    (quotation) => quotation.status === "Rejected",
  ).length;

  const expired = quotations.filter(
    (quotation) => quotation.status === "Expired",
  ).length;

  const acceptedValue = quotations
    .filter((quotation) => quotation.status === "Accepted")
    .reduce(
      (totalValue, quotation) =>
        totalValue + normalizeNumber(quotation.grandTotal),
      0,
    );

  const pendingValue = quotations
    .filter(
      (quotation) =>
        quotation.status === "Sent" || quotation.status === "Draft",
    )
    .reduce(
      (totalValue, quotation) =>
        totalValue + normalizeNumber(quotation.grandTotal),
      0,
    );

  return {
    total,
    draft,
    sent,
    accepted,
    rejected,
    expired,
    acceptedValue,
    pendingValue,
  };
}
