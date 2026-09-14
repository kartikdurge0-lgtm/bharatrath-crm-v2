import { createActivityLog } from "./activityLogStore";
import { supabase } from "../lib/supabase";

/* =========================================================
   RENEWAL TYPES
========================================================= */

export type RenewalStatus = "Upcoming" | "Due Soon" | "Overdue" | "Completed";

export type RenewalPaymentStatus = "Pending" | "Partially Paid" | "Paid";

export type Renewal = {
  id: string;

  clientId: string;
  clientName: string;

  service: string;
  serviceId?: string;

  renewalDate: string;

  amount: number;

  status: RenewalStatus;

  paymentStatus?: RenewalPaymentStatus;

  reminderDays?: number;

  notes?: string;

  createdAt: string;

  updatedAt?: string;

  completedAt?: string;

  assignedTo?: string;

  /*
   * Soft archive.
   * Records are never permanently deleted.
   */
  isArchived?: boolean;
};

/* =========================================================
   DATABASE ROW
========================================================= */

type RenewalRow = {
  id: number;

  client_id: number | null;
  service_id: number | null;
  assigned_to_id: number | null;

  renewal_date: string;
  amount: number | string | null;

  payment_status: string | null;
  reminder_days: number | null;

  notes: string | null;
  status: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  completed_at: string | null;

  /*
   * Archive columns are part of the CRM soft-delete design.
   */
  is_archived: boolean | null;
  archived_at: string | null;
};

type ClientRow = {
  id: number;
  crm_client_id: string | null;
  company_name: string | null;
  contact_person: string | null;
};

type ServiceRow = {
  id: number;
  name: string | null;
};

type SalesPersonRow = {
  id: number;
  name: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const STORAGE_KEY = "crm-renewals";

/* =========================================================
   DISPLAY ID HELPERS
========================================================= */

function formatRenewalId(databaseId: number): string {
  return `REN-${String(databaseId).padStart(3, "0")}`;
}

function getDatabaseIdFromRenewalId(renewalId: string): number | null {
  const match = String(renewalId || "")
    .trim()
    .match(/^REN-(\d+)$/i);

  if (!match) {
    return null;
  }

  const databaseId = Number(match[1]);

  return Number.isFinite(databaseId) ? databaseId : null;
}

/* =========================================================
   STATUS HELPERS
========================================================= */

function calculateRenewalStatus(
  renewalDate: string,
  storedStatus?: string | null,
): RenewalStatus {
  if (
    String(storedStatus || "")
      .trim()
      .toLowerCase() === "completed"
  ) {
    return "Completed";
  }

  if (!renewalDate) {
    return "Upcoming";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(renewalDate);
  date.setHours(0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return "Upcoming";
  }

  const difference = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (difference < 0) {
    return "Overdue";
  }

  if (difference <= 7) {
    return "Due Soon";
  }

  return "Upcoming";
}

function normalizePaymentStatus(
  value: string | null | undefined,
): RenewalPaymentStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "paid") {
    return "Paid";
  }

  if (
    normalized === "partially paid" ||
    normalized === "partial" ||
    normalized === "partially_paid"
  ) {
    return "Partially Paid";
  }

  return "Pending";
}

/* =========================================================
   MAP SUPABASE ROW
========================================================= */

function mapRenewalRow(
  row: RenewalRow,
  clientMap: Map<number, ClientRow>,
  serviceMap: Map<number, ServiceRow>,
  salesPersonMap: Map<number, SalesPersonRow>,
): Renewal {
  const client = row.client_id
    ? clientMap.get(Number(row.client_id))
    : undefined;

  const service = row.service_id
    ? serviceMap.get(Number(row.service_id))
    : undefined;

  const salesPerson = row.assigned_to_id
    ? salesPersonMap.get(Number(row.assigned_to_id))
    : undefined;

  const clientId =
    client?.crm_client_id ||
    (row.client_id ? `CL-${String(row.client_id).padStart(3, "0")}` : "");

  return {
    id: formatRenewalId(Number(row.id)),

    clientId,

    clientName: client?.company_name || "Unknown Client",

    service: service?.name || "Service",

    serviceId: row.service_id ? String(row.service_id) : undefined,

    renewalDate: row.renewal_date || "",

    amount: Number(row.amount || 0),

    status: calculateRenewalStatus(row.renewal_date, row.status),

    paymentStatus: normalizePaymentStatus(row.payment_status),

    reminderDays:
      row.reminder_days === null ? undefined : Number(row.reminder_days),

    notes: row.notes || undefined,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    completedAt: row.completed_at || undefined,

    assignedTo: salesPerson
      ? `SP-${String(salesPerson.id).padStart(3, "0")}`
      : undefined,

    isArchived: row.is_archived === true,
  };
}

/* =========================================================
   LOAD RELATED MAPS
========================================================= */

async function loadClientMap(
  rows: RenewalRow[],
): Promise<Map<number, ClientRow>> {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => Number(row.client_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, crm_client_id, company_name, contact_person")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(
    ((data || []) as ClientRow[]).map((row) => [Number(row.id), row]),
  );
}

async function loadServiceMap(
  rows: RenewalRow[],
): Promise<Map<number, ServiceRow>> {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => Number(row.service_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(
    ((data || []) as ServiceRow[]).map((row) => [Number(row.id), row]),
  );
}

async function loadSalesPersonMap(
  rows: RenewalRow[],
): Promise<Map<number, SalesPersonRow>> {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => Number(row.assigned_to_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .select("id, name")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(
    ((data || []) as SalesPersonRow[]).map((row) => [Number(row.id), row]),
  );
}

async function mapRenewalRows(rows: RenewalRow[]): Promise<Renewal[]> {
  if (rows.length === 0) {
    return [];
  }

  const [clientMap, serviceMap, salesPersonMap] = await Promise.all([
    loadClientMap(rows),
    loadServiceMap(rows),
    loadSalesPersonMap(rows),
  ]);

  return rows.map((row) =>
    mapRenewalRow(row, clientMap, serviceMap, salesPersonMap),
  );
}

/* =========================================================
   SUPABASE READ — SOURCE OF TRUTH
========================================================= */

export async function getRenewalsFromSupabase(): Promise<Renewal[]> {
  const { data, error } = await supabase
    .from("renewals")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load renewals:", error);
    throw error;
  }

  return mapRenewalRows((data || []) as RenewalRow[]);
}

/* =========================================================
   ACTIVE RENEWALS
========================================================= */

export async function getActiveRenewals(): Promise<Renewal[]> {
  const renewals = await getRenewalsFromSupabase();

  return renewals.filter((renewal) => renewal.isArchived !== true);
}

/* =========================================================
   ARCHIVED RENEWALS
========================================================= */

export async function getArchivedRenewals(): Promise<Renewal[]> {
  const renewals = await getRenewalsFromSupabase();

  return renewals.filter((renewal) => renewal.isArchived === true);
}

/* =========================================================
   GET ONE — ACTIVE
========================================================= */

export async function getRenewalFromSupabase(
  id: string,
): Promise<Renewal | null> {
  const databaseId = getDatabaseIdFromRenewalId(id);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("renewals")
    .select("*")
    .eq("id", databaseId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    console.error("Failed to load renewal:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const result = await mapRenewalRows([data as RenewalRow]);

  return result[0] || null;
}

/* =========================================================
   GET ONE — INCLUDING ARCHIVED
========================================================= */

export async function getRenewalIncludingArchived(
  id: string,
): Promise<Renewal | null> {
  const databaseId = getDatabaseIdFromRenewalId(id);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("renewals")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load renewal including archived:", error);

    throw error;
  }

  if (!data) {
    return null;
  }

  const result = await mapRenewalRows([data as RenewalRow]);

  return result[0] || null;
}

/* =========================================================
   GENERATE NEXT RENEWAL ID
========================================================= */

export async function generateRenewalIdFromSupabase(): Promise<string> {
  const { data, error } = await supabase
    .from("renewals")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to generate renewal ID:", error);

    throw error;
  }

  const nextDatabaseId = data ? Number(data.id) + 1 : 1;

  return formatRenewalId(nextDatabaseId);
}

/* =========================================================
   RESOLVE CLIENT CRM ID → DATABASE ID
========================================================= */

export async function resolveRenewalClientId(
  clientId: string,
): Promise<number | null> {
  const normalized = String(clientId || "").trim();

  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("crm_client_id", normalized)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    const id = Number(data.id);

    return Number.isFinite(id) ? id : null;
  }

  /*
   * Legacy fallback for CL-001 style IDs.
   * We never guess by company name.
   */
  const match = normalized.match(/^CL-(\d+)$/i);

  if (!match) {
    return null;
  }

  const numericId = Number(match[1]);

  if (!Number.isFinite(numericId)) {
    return null;
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", numericId)
    .maybeSingle();

  if (legacyError) {
    throw legacyError;
  }

  return legacy ? Number(legacy.id) : null;
}

/* =========================================================
   RESOLVE SERVICE → DATABASE ID
========================================================= */

async function resolveRenewalServiceId(
  serviceId: string | undefined,
  serviceName: string,
): Promise<number | null> {
  /*
   * serviceStore maps:
   *
   * services.service_code → Service.id
   *
   * Therefore first resolve by service_code.
   */

  const normalizedServiceId = String(serviceId || "").trim();

  if (normalizedServiceId) {
    const { data, error } = await supabase
      .from("services")
      .select("id")
      .eq("service_code", normalizedServiceId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return Number(data.id);
    }

    /*
     * Backward compatibility:
     * If a caller passes the numeric database ID.
     */
    const numericId = Number(normalizedServiceId);

    if (Number.isFinite(numericId)) {
      const { data: numericService, error: numericError } = await supabase
        .from("services")
        .select("id")
        .eq("id", numericId)
        .maybeSingle();

      if (numericError) {
        throw numericError;
      }

      if (numericService) {
        return Number(numericService.id);
      }
    }
  }

  /*
   * Fallback by actual Supabase column:
   *
   * services.name
   *
   * NOT services.service_name
   */
  const normalizedName = String(serviceName || "")
    .trim()
    .toLowerCase();

  if (!normalizedName) {
    return null;
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .ilike("name", serviceName.trim())
    .limit(10);

  if (error) {
    throw error;
  }

  const matches = (data || []).filter(
    (service) =>
      String(service.name || "")
        .trim()
        .toLowerCase() === normalizedName,
  );

  /*
   * Never guess if multiple services have the
   * same name.
   */
  if (matches.length !== 1) {
    return null;
  }

  return Number(matches[0].id);
}

/* =========================================================
   RESOLVE SALES PERSON
========================================================= */

async function resolveRenewalSalesPersonId(
  assignedTo: string | undefined,
): Promise<number | null> {
  const value = String(assignedTo || "").trim();

  if (!value) {
    return null;
  }

  const match = value.match(/^SP-(\d+)$/i);

  if (!match) {
    return null;
  }

  const databaseId = Number(match[1]);

  if (!Number.isFinite(databaseId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .select("id")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? Number(data.id) : null;
}

/* =========================================================
   CURRENT USER
========================================================= */

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id || null;
}

/* =========================================================
   DATABASE PAYLOAD
========================================================= */

async function buildRenewalPayload(
  renewal: Renewal,
): Promise<Record<string, unknown>> {
  const clientDatabaseId = await resolveRenewalClientId(renewal.clientId);

  if (clientDatabaseId === null) {
    throw new Error(
      `Client "${renewal.clientId}" was not found in the database.`,
    );
  }

  const serviceDatabaseId = await resolveRenewalServiceId(
    renewal.serviceId,
    renewal.service,
  );

  if (serviceDatabaseId === null) {
    throw new Error(
      `Service "${renewal.service}" was not found in the database.`,
    );
  }

  const assignedToId = await resolveRenewalSalesPersonId(renewal.assignedTo);

  return {
    client_id: clientDatabaseId,

    service_id: serviceDatabaseId,

    assigned_to_id: assignedToId,

    renewal_date: renewal.renewalDate,

    amount: Number(renewal.amount || 0),

    payment_status: renewal.paymentStatus || "Pending",

    reminder_days: renewal.reminderDays ?? 7,

    notes: renewal.notes || null,

    status: renewal.status === "Completed" ? "Completed" : "Active",

    completed_at: renewal.completedAt || null,

    is_archived: renewal.isArchived === true,

    archived_at: renewal.isArchived === true ? new Date().toISOString() : null,

    updated_at: new Date().toISOString(),
  };
}

/* =========================================================
   ADD RENEWAL — SUPABASE
========================================================= */

export async function addRenewalToSupabase(renewal: Renewal): Promise<Renewal> {
  const payload = await buildRenewalPayload({
    ...renewal,
    isArchived: false,
  });

  payload.created_by = await getCurrentUserId();

  const { data, error } = await supabase
    .from("renewals")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to add renewal:", error);
    throw error;
  }

  const created = (await mapRenewalRows([data as RenewalRow]))[0];

  if (!created) {
    throw new Error("Renewal was created but could not be read back.");
  }

  void createActivityLog({
    action: "CREATE",
    module: "Renewals",
    record_id: created.id,
    record_name: `${created.clientName} - ${created.service}`,
    description: `Created renewal for "${created.clientName}" - ${created.service}`,
    new_data: created as unknown as Record<string, unknown>,
  });

  return created;
}

/* =========================================================
   UPDATE RENEWAL — SUPABASE
========================================================= */

export async function updateRenewalInSupabase(
  id: string,
  updates: Partial<Renewal>,
): Promise<Renewal | null> {
  const databaseId = getDatabaseIdFromRenewalId(id);

  if (databaseId === null) {
    return null;
  }

  const existing = await getRenewalIncludingArchived(id);

  if (!existing || existing.isArchived === true) {
    return null;
  }

  /*
   * Renewal ID is immutable.
   */
  const merged: Renewal = {
    ...existing,
    ...updates,
    id: existing.id,
    isArchived: false,
  };

  const payload = await buildRenewalPayload(merged);

  const { data, error } = await supabase
    .from("renewals")
    .update(payload)
    .eq("id", databaseId)
    .eq("is_archived", false)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update renewal:", error);
    throw error;
  }

  const updated = (await mapRenewalRows([data as RenewalRow]))[0];

  if (!updated) {
    throw new Error("Renewal was updated but could not be read back.");
  }

  const oldData = existing as unknown as Record<string, unknown>;

  const newData = updated as unknown as Record<string, unknown>;

  const recordName = `${updated.clientName} - ${updated.service}`;

  if (existing.status !== updated.status) {
    void createActivityLog({
      action: "STATUS_CHANGED",
      module: "Renewals",
      record_id: updated.id,
      record_name: recordName,
      description:
        `Changed renewal "${recordName}" status from ` +
        `"${existing.status}" to "${updated.status}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  const updateKeys = Object.keys(updates).filter(
    (key) => key !== "id" && key !== "status" && key !== "isArchived",
  );

  if (updateKeys.length > 0) {
    void createActivityLog({
      action: "UPDATE",
      module: "Renewals",
      record_id: updated.id,
      record_name: recordName,
      description: `Updated renewal "${recordName}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  return updated;
}

/* =========================================================
   COMPLETE RENEWAL — SUPABASE
========================================================= */

export async function completeRenewalInSupabase(
  id: string,
): Promise<Renewal | null> {
  return updateRenewalInSupabase(id, {
    status: "Completed",
    completedAt: new Date().toISOString(),
  });
}

/* =========================================================
   ARCHIVE RENEWAL — SUPABASE
========================================================= */

export async function archiveRenewal(id: string): Promise<boolean> {
  const databaseId = getDatabaseIdFromRenewalId(id);

  if (databaseId === null) {
    return false;
  }

  const existing = await getRenewalIncludingArchived(id);

  if (!existing || existing.isArchived === true) {
    return false;
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("renewals")
    .update({
      is_archived: true,
      archived_at: now,
      updated_at: now,
    })
    .eq("id", databaseId)
    .eq("is_archived", false);

  if (error) {
    console.error("Failed to archive renewal:", error);

    throw error;
  }

  void createActivityLog({
    action: "ARCHIVE",
    module: "Renewals",
    record_id: existing.id,
    record_name: `${existing.clientName} - ${existing.service}`,
    description: `Archived renewal "${existing.clientName} - ${existing.service}"`,
    old_data: existing as unknown as Record<string, unknown>,
    new_data: {
      ...existing,
      isArchived: true,
      archivedAt: now,
    } as unknown as Record<string, unknown>,
  });

  return true;
}

/* =========================================================
   RESTORE RENEWAL — SUPABASE
========================================================= */

export async function restoreRenewal(id: string): Promise<Renewal | null> {
  const databaseId = getDatabaseIdFromRenewalId(id);

  if (databaseId === null) {
    return null;
  }

  const existing = await getRenewalIncludingArchived(id);

  if (!existing || existing.isArchived !== true) {
    return null;
  }

  const { data, error } = await supabase
    .from("renewals")
    .update({
      is_archived: false,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", databaseId)
    .eq("is_archived", true)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to restore renewal:", error);

    throw error;
  }

  const restored = (await mapRenewalRows([data as RenewalRow]))[0];

  if (!restored) {
    throw new Error("Renewal was restored but could not be read back.");
  }

  void createActivityLog({
    action: "RESTORE",
    module: "Renewals",
    record_id: restored.id,
    record_name: `${restored.clientName} - ${restored.service}`,
    description: `Restored renewal "${restored.clientName} - ${restored.service}"`,
    old_data: existing as unknown as Record<string, unknown>,
    new_data: restored as unknown as Record<string, unknown>,
  });

  return restored;
}

/* =========================================================
   RENEWAL QUERIES
========================================================= */

export async function getRenewalsByClient(
  clientId: string,
): Promise<Renewal[]> {
  const renewals = await getActiveRenewals();

  return renewals.filter(
    (renewal) => String(renewal.clientId) === String(clientId),
  );
}

export async function getRenewalsByStatus(
  status: RenewalStatus,
): Promise<Renewal[]> {
  const renewals = await getActiveRenewals();

  return renewals.filter((renewal) => renewal.status === status);
}

export async function searchRenewals(search: string): Promise<Renewal[]> {
  const query = String(search || "")
    .trim()
    .toLowerCase();

  const renewals = await getActiveRenewals();

  if (!query) {
    return renewals;
  }

  return renewals.filter((renewal) => {
    const fields = [
      renewal.id,
      renewal.clientId,
      renewal.clientName,
      renewal.service,
      renewal.status,
      renewal.paymentStatus,
      renewal.notes,
    ];

    return fields.some((field) =>
      String(field || "")
        .toLowerCase()
        .includes(query),
    );
  });
}

/* =========================================================
   RENEWAL STATISTICS
========================================================= */

export async function getRenewalStats(): Promise<{
  total: number;
  upcoming: number;
  dueSoon: number;
  overdue: number;
  completed: number;
  pendingPayment: number;
  partiallyPaid: number;
  paid: number;
}> {
  const renewals = await getActiveRenewals();

  return {
    total: renewals.length,

    upcoming: renewals.filter((renewal) => renewal.status === "Upcoming")
      .length,

    dueSoon: renewals.filter((renewal) => renewal.status === "Due Soon").length,

    overdue: renewals.filter((renewal) => renewal.status === "Overdue").length,

    completed: renewals.filter((renewal) => renewal.status === "Completed")
      .length,

    pendingPayment: renewals.filter(
      (renewal) => renewal.paymentStatus === "Pending",
    ).length,

    partiallyPaid: renewals.filter(
      (renewal) => renewal.paymentStatus === "Partially Paid",
    ).length,

    paid: renewals.filter((renewal) => renewal.paymentStatus === "Paid").length,
  };
}

/* =========================================================
   COMPATIBILITY CACHE
   ---------------------------------------------------------
   IMPORTANT:
   This is retained temporarily so non-migrated pages
   continue compiling.

   It is NOT a source of truth.
========================================================= */

export function getRenewals(): Renewal[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    return Array.isArray(parsed) ? (parsed as Renewal[]) : [];
  } catch {
    return [];
  }
}

export function saveRenewals(renewals: Renewal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(renewals));
}

/* =========================================================
   LEGACY COMPATIBILITY — SINGLE RECORD
========================================================= */

export function getRenewalSync(id: string): Renewal | null {
  const renewals = getRenewals();

  return (
    renewals.find(
      (renewal) => renewal.id === id && renewal.isArchived !== true,
    ) || null
  );
}

/* =========================================================
   LEGACY COMPATIBILITY — ID
========================================================= */

export function generateRenewalId(): string {
  const renewals = getRenewals();

  let maxNumber = 0;

  renewals.forEach((renewal) => {
    const match = String(renewal.id).match(/^REN-(\d+)$/);

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      maxNumber = Math.max(maxNumber, number);
    }
  });

  return formatRenewalId(maxNumber + 1);
}

/* =========================================================
   CACHE REFRESH
========================================================= */

export async function refreshRenewalCache(): Promise<Renewal[]> {
  const renewals = await getRenewalsFromSupabase();

  saveRenewals(renewals);

  return renewals;
}
