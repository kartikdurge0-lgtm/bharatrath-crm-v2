import { supabase } from "../lib/supabase";

export type SalesPersonType = "Staff" | "Part-time" | "External";

export type SalesPersonStatus = "Active" | "Inactive";

export type SalesPerson = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  type: SalesPersonType;
  commissionPercent: number;
  status: SalesPersonStatus;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

type SalesPersonRow = {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  type: SalesPersonType;
  commission_percent: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function formatSalesPersonId(id: number): string {
  return `SP-${String(id).padStart(3, "0")}`;
}

function mapSalesPerson(row: SalesPersonRow): SalesPerson {
  return {
    id: formatSalesPersonId(row.id),
    name: row.name,
    mobile: row.mobile ?? "",
    email: row.email ?? "",
    type: row.type,
    commissionPercent: Number(row.commission_percent ?? 0),
    status: row.is_active ? "Active" : "Inactive",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDatabaseId(displayId: string): number | null {
  const match = displayId.match(/^SP-(\d+)$/i);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id) ? id : null;
}

/* =====================================================
   GET ALL
===================================================== */

export async function getSalesPersons(): Promise<SalesPerson[]> {
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase sales persons error:", error);
    return [];
  }

  return (data as SalesPersonRow[]).map(mapSalesPerson);
}

/* =====================================================
   GET ONE
===================================================== */

export async function getSalesPerson(
  displayId: string,
): Promise<SalesPerson | null> {
  const databaseId = getDatabaseId(displayId);

  if (databaseId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (error) {
    console.error("Supabase sales person error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   ADD
===================================================== */

export async function addSalesPerson(
  salesPerson: Omit<SalesPerson, "id" | "createdAt" | "updatedAt">,
): Promise<SalesPerson | null> {
  const { data, error } = await supabase
    .from("sales_persons")
    .insert({
      name: salesPerson.name,
      mobile: salesPerson.mobile || null,
      email: salesPerson.email || null,
      type: salesPerson.type,
      commission_percent: salesPerson.commissionPercent,
      is_active: salesPerson.status === "Active",
      notes: salesPerson.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Add sales person error:", error);
    return null;
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   UPDATE
===================================================== */

export async function updateSalesPerson(
  displayId: string,
  updates: Partial<SalesPerson>,
): Promise<SalesPerson | null> {
  const databaseId = getDatabaseId(displayId);

  if (databaseId === null) {
    return null;
  }

  const databaseUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    databaseUpdates.name = updates.name;
  }

  if (updates.mobile !== undefined) {
    databaseUpdates.mobile = updates.mobile || null;
  }

  if (updates.email !== undefined) {
    databaseUpdates.email = updates.email || null;
  }

  if (updates.type !== undefined) {
    databaseUpdates.type = updates.type;
  }

  if (updates.commissionPercent !== undefined) {
    databaseUpdates.commission_percent = updates.commissionPercent;
  }

  if (updates.status !== undefined) {
    databaseUpdates.is_active = updates.status === "Active";
  }

  if (updates.notes !== undefined) {
    databaseUpdates.notes = updates.notes || null;
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .update(databaseUpdates)
    .eq("id", databaseId)
    .select("*")
    .single();

  if (error) {
    console.error("Update sales person error:", error);
    return null;
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   ACTIVATE / DEACTIVATE
===================================================== */

export async function deactivateSalesPerson(
  displayId: string,
): Promise<SalesPerson | null> {
  return updateSalesPerson(displayId, {
    status: "Inactive",
  });
}

export async function activateSalesPerson(
  displayId: string,
): Promise<SalesPerson | null> {
  return updateSalesPerson(displayId, {
    status: "Active",
  });
}

/* =====================================================
   ACTIVE SALES PERSONS
===================================================== */

export async function getActiveSalesPersons(): Promise<SalesPerson[]> {
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase active sales persons error:", error);
    return [];
  }

  return (data as SalesPersonRow[]).map(mapSalesPerson);
}

/* =====================================================
   INTERNAL TEAM MEMBERS
===================================================== */

export async function getInternalTeamMembers(): Promise<SalesPerson[]> {
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .eq("is_active", true)
    .in("type", ["Staff", "Part-time"])
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase internal team members error:", error);
    return [];
  }

  return (data as SalesPersonRow[]).map(mapSalesPerson);
}

/* =====================================================
   LEGACY HELPERS
===================================================== */

export function generateSalesPersonId(): string {
  return "SP-NEW";
}
