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

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
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
    throw error;
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
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   DUPLICATE CHECK
===================================================== */

async function checkDuplicateSalesPerson({
  name,
  email,
  mobile,
  excludeDisplayId,
}: {
  name: string;
  email?: string;
  mobile?: string;
  excludeDisplayId?: string;
}) {
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Sales person duplicate check error:", error);
    throw error;
  }

  const excludeId = excludeDisplayId ? getDatabaseId(excludeDisplayId) : null;

  const normalizedName = normalize(name);
  const normalizedEmail = normalize(email);
  const normalizedMobile = normalize(mobile);

  const duplicate = (data as SalesPersonRow[]).find((row) => {
    if (excludeId !== null && row.id === excludeId) {
      return false;
    }

    const sameName =
      normalizedName !== "" && normalize(row.name) === normalizedName;

    const sameEmail =
      normalizedEmail !== "" && normalize(row.email) === normalizedEmail;

    const sameMobile =
      normalizedMobile !== "" && normalize(row.mobile) === normalizedMobile;

    return sameName || sameEmail || sameMobile;
  });

  return duplicate ? mapSalesPerson(duplicate) : null;
}

/* =====================================================
   ADD
===================================================== */

export async function addSalesPerson(
  salesPerson: Omit<SalesPerson, "id" | "createdAt" | "updatedAt">,
): Promise<SalesPerson> {
  const duplicate = await checkDuplicateSalesPerson({
    name: salesPerson.name,
    email: salesPerson.email,
    mobile: salesPerson.mobile,
  });

  if (duplicate) {
    if (duplicate.status === "Inactive") {
      throw new Error(
        `A Sales Person with this name, email or mobile already exists but is inactive (${duplicate.id}). Please activate the existing record instead of creating a duplicate.`,
      );
    }

    throw new Error(
      `A Sales Person with this name, email or mobile already exists (${duplicate.id}).`,
    );
  }

  const { data, error } = await supabase
    .from("sales_persons")
    .insert({
      name: salesPerson.name.trim(),
      mobile: salesPerson.mobile?.trim() || null,
      email: salesPerson.email?.trim() || null,
      type: salesPerson.type,
      commission_percent: salesPerson.commissionPercent,
      is_active: salesPerson.status === "Active",
      notes: salesPerson.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Add sales person error:", error);
    throw error;
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   UPDATE
===================================================== */

export async function updateSalesPerson(
  displayId: string,
  updates: Partial<SalesPerson>,
): Promise<SalesPerson> {
  const databaseId = getDatabaseId(displayId);

  if (databaseId === null) {
    throw new Error("Invalid Sales Person ID.");
  }

  // -----------------------------------------------------
  // Load current record first
  // -----------------------------------------------------

  const { data: currentData, error: currentError } = await supabase
    .from("sales_persons")
    .select("*")
    .eq("id", databaseId)
    .maybeSingle();

  if (currentError) {
    console.error("Load sales person before update error:", currentError);
    throw currentError;
  }

  if (!currentData) {
    throw new Error("Sales Person record not found.");
  }

  const current = currentData as SalesPersonRow;

  // -----------------------------------------------------
  // Build the final values that the record will have
  // -----------------------------------------------------

  const finalName =
    updates.name !== undefined ? updates.name.trim() : current.name;

  const finalEmail =
    updates.email !== undefined ? updates.email.trim() : (current.email ?? "");

  const finalMobile =
    updates.mobile !== undefined
      ? updates.mobile.trim()
      : (current.mobile ?? "");

  // -----------------------------------------------------
  // Duplicate check
  //
  // Only block if the identity information is actually
  // being changed to something already used by another
  // record.
  // -----------------------------------------------------

  const nameChanged = normalize(finalName) !== normalize(current.name);

  const emailChanged = normalize(finalEmail) !== normalize(current.email);

  const mobileChanged = normalize(finalMobile) !== normalize(current.mobile);

  if (nameChanged || emailChanged || mobileChanged) {
    const duplicate = await checkDuplicateSalesPerson({
      name: finalName,
      email: finalEmail,
      mobile: finalMobile,
      excludeDisplayId: displayId,
    });

    if (duplicate) {
      throw new Error(
        `Another Sales Person already uses this name, email or mobile (${duplicate.id}).`,
      );
    }
  }

  // -----------------------------------------------------
  // Prepare database update
  // -----------------------------------------------------

  const databaseUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    databaseUpdates.name = finalName;
  }

  if (updates.mobile !== undefined) {
    databaseUpdates.mobile = finalMobile || null;
  }

  if (updates.email !== undefined) {
    databaseUpdates.email = finalEmail || null;
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
    databaseUpdates.notes = updates.notes.trim() || null;
  }

  // -----------------------------------------------------
  // Update Supabase
  // -----------------------------------------------------

  const { data, error } = await supabase
    .from("sales_persons")
    .update(databaseUpdates)
    .eq("id", databaseId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Update sales person error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Sales Person could not be updated.");
  }

  return mapSalesPerson(data as SalesPersonRow);
}

/* =====================================================
   ACTIVATE / DEACTIVATE
===================================================== */

export async function deactivateSalesPerson(
  displayId: string,
): Promise<SalesPerson> {
  return updateSalesPerson(displayId, {
    status: "Inactive",
  });
}

export async function activateSalesPerson(
  displayId: string,
): Promise<SalesPerson> {
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
    throw error;
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
    throw error;
  }

  return (data as SalesPersonRow[]).map(mapSalesPerson);
}

/* =====================================================
   LEGACY HELPERS
===================================================== */

export function generateSalesPersonId(): string {
  return "SP-NEW";
}
