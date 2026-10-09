import { createActivityLog } from "./activityLogStore";

import { supabase } from "../lib/supabase";

/* =========================================================

   CLIENT TYPE

\========================================================= */

export type Client = {
  id: string;

  company: string;

  contactPerson: string;

  phone: string;

  email: string;

  address: string;

  gst: string;

  services: string;

  status: string; /*

   \* Soft archive.

   \*

   \* Clients are never permanently deleted.

   */

  archived?: boolean;
};

/* =========================================================

   DEFAULT CLIENTS

   ---------------------------------------------------------

   IMPORTANT:

   These are legacy/local fallback records only.



   They are NOT automatically pushed to Supabase.

\========================================================= */

export const defaultClients: Client[] = [
  {
    id: "CL-001",

    company: "ABC Agro Producer Company",

    contactPerson: "Rajesh Patil",

    phone: "+91 98765 43210",

    email: "contact@abcagro.com",

    address: "Pune, Maharashtra",

    gst: "27ABCDE1234F1Z5",

    services: "Website",

    status: "Active",

    archived: false,
  },

  {
    id: "CL-002",

    company: "Bharat FPO",

    contactPerson: "Amit Kumar",

    phone: "+91 98765 12345",

    email: "info@bharatfpo.com",

    address: "Bhubaneswar, Odisha",

    gst: "21ABCDE1234F1Z5",

    services: "POS + ERP",

    status: "Active",

    archived: false,
  },

  {
    id: "CL-003",

    company: "Maharashtra Foods",

    contactPerson: "Sneha Deshmukh",

    phone: "+91 99887 66554",

    email: "hello@mahafoods.com",

    address: "Nashik, Maharashtra",

    gst: "27XYZAB5678G1Z2",

    services: "Digital Marketing",

    status: "Active",

    archived: false,
  },

  {
    id: "CL-004",

    company: "Rural Mart",

    contactPerson: "Suresh Pawar",

    phone: "+91 97654 32109",

    email: "ruralmart@example.com",

    address: "Satara, Maharashtra",

    gst: "27LMNOP1234H1Z6",

    services: "Website + Hosting",

    status: "Pending",

    archived: false,
  },
];

const STORAGE_KEY = "crm-clients";

/* =========================================================

   NORMALIZE CLIENT

\========================================================= */

function normalizeClient(client: Partial<Client>): Client {
  return {
    id: String(client.id ?? "").trim(),

    company: String(client.company ?? "").trim(),

    contactPerson: String(client.contactPerson ?? "").trim(),

    phone: String(client.phone ?? "").trim(),

    email: String(client.email ?? "").trim(),

    address: String(client.address ?? "").trim(),

    gst: String(client.gst ?? "").trim(),

    services: String(client.services ?? "").trim(),

    status: String(client.status ?? "Active").trim() || "Active",

    archived:
      client.archived === true ||
      String(client.archived ?? "").toLowerCase() === "true",
  };
}

/* =========================================================

   LOCAL STORAGE

   ---------------------------------------------------------

   IMPORTANT:

   LocalStorage is retained as a temporary client cache/

   compatibility layer for the existing UI.



   It is NOT automatically synchronized to Supabase.

\========================================================= */

export function getClients(): Client[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    /*

     \* Keep existing application behaviour for first load.

     \*

     \* IMPORTANT:

     \* This only initializes the browser cache.

     \* It does NOT write anything to Supabase.

     */

    const normalizedDefaults = defaultClients.map(normalizeClient);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDefaults));

    return normalizedDefaults;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid clients data.");
    }

    return parsed

      .map((client) => normalizeClient(client as Partial<Client>))

      .filter((client) => Boolean(client.id));
  } catch (error) {
    console.error("Invalid local client data:", error);

    const normalizedDefaults = defaultClients.map(normalizeClient);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDefaults));

    return normalizedDefaults;
  }
}

/* =========================================================

   SAVE CLIENTS

   ---------------------------------------------------------

   Local cache only.

\========================================================= */

export function saveClients(clients: Client[]): void {
  localStorage.setItem(
    STORAGE_KEY,

    JSON.stringify(clients.map((client) => normalizeClient(client))),
  );
}

/* =========================================================

   SUPABASE CLIENT DATA

\========================================================= */

function getSupabaseClientData(client: Client) {
  return {
    /*

     \* CRM ID is the stable business identifier.

     \*

     \* Example:

     \* CL-005

     */

    crm_client_id: client.id,

    company_name: client.company,

    contact_person: client.contactPerson || null,

    phone: client.phone || null,

    email: client.email || null,

    address: client.address || null,

    gst_number: client.gst || null /*

     \* Existing database structure uses notes for the

     \* service summary stored by the CRM.

     */,

    notes: client.services || null,

    status: client.status || "Active" /*

     \* Existing database column is is_archived.

     */,

    is_archived: client.archived === true,
  };
}

/* =========================================================

   SUPABASE CLIENT ROW HELPERS

\========================================================= */

type SupabaseClientRow = {
  id: number | string;

  crm_client_id?: string | null;

  company_name?: string | null;

  contact_person?: string | null;

  phone?: string | null;

  email?: string | null;

  address?: string | null;

  gst_number?: string | null;

  notes?: string | null;

  status?: string | null;

  is_archived?: boolean | null;
};

function mapSupabaseClientRow(row: SupabaseClientRow): Client {
  return normalizeClient({
    id: String(row.crm_client_id || `CL-${String(row.id).padStart(3, "0")}`),

    company: row.company_name || "",

    contactPerson: row.contact_person || "",

    phone: row.phone || "",

    email: row.email || "",

    address: row.address || "",

    gst: row.gst_number || "",

    services: row.notes || "",

    status: row.status || "Active",

    archived: row.is_archived === true,
  });
}

async function loadAllSupabaseClients(): Promise<Client[]> {
  const { data, error } = await supabase

    .from("clients")

    .select(
      "id, crm_client_id, company_name, contact_person, phone, email, address, gst_number, notes, status, is_archived",
    )

    .order("created_at", { ascending: false })

    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load clients from Supabase:", error);

    throw error;
  }

  return (data || []).map((row) =>
    mapSupabaseClientRow(row as SupabaseClientRow),
  );
}

async function loadClientByCrmId(
  crmClientId: string,
): Promise<Client | undefined> {
  const normalizedId = String(crmClientId || "").trim();

  if (!normalizedId) {
    return undefined;
  }

  const { data, error } = await supabase

    .from("clients")

    .select(
      "id, crm_client_id, company_name, contact_person, phone, email, address, gst_number, notes, status, is_archived",
    )

    .eq("crm_client_id", normalizedId)

    .maybeSingle();

  if (error) {
    console.error("Failed to load client by CRM ID:", error);

    throw error;
  }

  return data ? mapSupabaseClientRow(data as SupabaseClientRow) : undefined;
}

function normalizePhone(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return String(value || "")
    .trim()

    .toLowerCase();
}

function normalizeCompany(value: string): string {
  return String(value || "")
    .trim()

    .toLowerCase();
}

async function findDuplicateClientInSupabase(
  client: Client,

  excludeCrmId?: string,
): Promise<Client | undefined> {
  const clients = await loadAllSupabaseClients();

  const phone = normalizePhone(client.phone);

  const email = normalizeEmail(client.email);

  const company = normalizeCompany(client.company);

  return clients.find((existing) => {
    if (excludeCrmId && existing.id === String(excludeCrmId).trim()) {
      return false;
    }

    const samePhone =
      Boolean(phone) &&
      Boolean(normalizePhone(existing.phone)) &&
      phone === normalizePhone(existing.phone);

    const sameEmail =
      Boolean(email) &&
      Boolean(normalizeEmail(existing.email)) &&
      email === normalizeEmail(existing.email);

    const sameCompany =
      Boolean(company) &&
      Boolean(normalizeCompany(existing.company)) &&
      company === normalizeCompany(existing.company);

    return samePhone || sameEmail || sameCompany;
  });
}

/* =========================================================

   GET SUPABASE CLIENT ID BY CRM ID

   ---------------------------------------------------------

   CRM:

   CL-005



   Supabase:

   clients.id = 45

   clients.crm_client_id = CL-005

\========================================================= */

export async function getSupabaseClientIdByCrmId(
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
    console.error("Failed to find Supabase client by CRM ID:", error);

    throw error;
  }

  if (!data) {
    return null;
  }

  const databaseId = Number(data.id);

  if (!Number.isFinite(databaseId)) {
    return null;
  }

  return databaseId;
}

/* =========================================================

   GET CRM CLIENT ID BY SUPABASE ID

   ---------------------------------------------------------

   Used by lead conversion mapping.



   Supabase:

   converted_client_id = 45



   Client:

   id = 45

   crm_client_id = CL-005



   Frontend:

   convertedClientId = CL-005

\========================================================= */

export async function getCrmClientIdBySupabaseId(
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
    console.error("Failed to find CRM client ID by Supabase ID:", error);

    throw error;
  }

  if (!data?.crm_client_id) {
    return null;
  }

  return String(data.crm_client_id);
}

/* =========================================================

   SYNC ONE CLIENT TO SUPABASE

   ---------------------------------------------------------

   IMPORTANT:

   This function is ONLY called explicitly by a user

   operation such as Add / Edit / Archive / Restore.



   There is NO background bulk synchronization.

\========================================================= */

async function syncClientToSupabase(client: Client): Promise<number | null> {
  const normalizedClient = normalizeClient(client);

  if (!normalizedClient.id) {
    throw new Error("Client CRM ID is required.");
  }

  if (!normalizedClient.company) {
    throw new Error("Client company name is required.");
  }

  try {
    const clientData =
      getSupabaseClientData(
        normalizedClient,
      ); /* -----------------------------------------------------

       1. PRIMARY LOOKUP BY CRM CLIENT ID

    ----------------------------------------------------- */

    const { data: existingByCrmId, error: crmLookupError } = await supabase

      .from("clients")

      .select("id, crm_client_id, company_name")

      .eq("crm_client_id", normalizedClient.id)

      .maybeSingle();

    if (crmLookupError) {
      console.error("Client CRM ID lookup error:", crmLookupError);

      throw crmLookupError;
    } /* -----------------------------------------------------

       2. UPDATE EXISTING CLIENT BY CRM ID

    ----------------------------------------------------- */

    if (existingByCrmId) {
      const databaseId = Number(existingByCrmId.id);

      if (!Number.isFinite(databaseId)) {
        throw new Error(
          `Invalid Supabase client ID for ${normalizedClient.id}.`,
        );
      }

      const { error: updateError } = await supabase

        .from("clients")

        .update(clientData)

        .eq("id", databaseId);

      if (updateError) {
        console.error("Client Supabase update error:", updateError);

        throw updateError;
      }

      return databaseId;
    } /* -----------------------------------------------------

       3. LEGACY FALLBACK

       -----------------------------------------------------

       Some old production records may not yet have

       crm_client_id.



       We may use company_name ONLY when exactly one

       matching record exists.



       If multiple records exist, we NEVER guess.

    ----------------------------------------------------- */

    const { data: companyMatches, error: companyLookupError } = await supabase

      .from("clients")

      .select("id, crm_client_id, company_name")

      .eq("company_name", normalizedClient.company)

      .limit(2);

    if (companyLookupError) {
      console.error("Legacy client company lookup error:", companyLookupError);

      throw companyLookupError;
    } /* -----------------------------------------------------

       4. EXACTLY ONE LEGACY MATCH

    ----------------------------------------------------- */

    if (companyMatches && companyMatches.length === 1) {
      const existing = companyMatches[0];

      const databaseId = Number(existing.id);

      if (!Number.isFinite(databaseId)) {
        throw new Error(
          `Invalid Supabase client ID for "${normalizedClient.company}".`,
        );
      }

      const { error: updateError } = await supabase

        .from("clients")

        .update(clientData)

        .eq("id", databaseId);

      if (updateError) {
        console.error("Legacy client migration update error:", updateError);

        throw updateError;
      }

      console.info(
        `Linked legacy client "${normalizedClient.company}" ` +
          `to CRM ID ${normalizedClient.id}.`,
      );

      return databaseId;
    } /* -----------------------------------------------------

       5. MULTIPLE LEGACY MATCHES

    ----------------------------------------------------- */

    if (companyMatches && companyMatches.length > 1) {
      console.warn(
        `Multiple Supabase clients found for company ` +
          `"${normalizedClient.company}". ` +
          `CRM ID "${normalizedClient.id}" was not automatically linked.`,
      );

      return null;
    } /* -----------------------------------------------------

       6. CREATE NEW CLIENT

    ----------------------------------------------------- */

    const { data: created, error: createError } = await supabase

      .from("clients")

      .insert(clientData)

      .select("id")

      .single();

    if (createError) {
      console.error("Client Supabase insert error:", createError);

      throw createError;
    }

    if (!created) {
      throw new Error("Supabase created client but returned no ID.");
    }

    const databaseId = Number(created.id);

    if (!Number.isFinite(databaseId)) {
      throw new Error("Supabase returned an invalid client ID.");
    }

    return databaseId;
  } catch (error) {
    console.error("Client Supabase operation failed:", error);

    throw error;
  }
}

/* =========================================================

   SUPABASE READ APIs

   ---------------------------------------------------------

   These APIs are the source-of-truth read path for pages

   being migrated to Supabase. Existing synchronous APIs

   above remain as a compatibility cache until each page is

   migrated.

\========================================================= */

export async function getClientsFromSupabase(): Promise<Client[]> {
  return loadAllSupabaseClients();
}

export async function getActiveClientsFromSupabase(): Promise<Client[]> {
  const clients = await loadAllSupabaseClients();

  return clients.filter((client) => client.archived !== true);
}

export async function getArchivedClientsFromSupabase(): Promise<Client[]> {
  const clients = await loadAllSupabaseClients();

  return clients.filter((client) => client.archived === true);
}

export async function getClientByIdFromSupabase(
  crmClientId: string,
): Promise<Client | undefined> {
  return loadClientByCrmId(crmClientId);
}

/* =========================================================

   NEXT CRM CLIENT ID

   ---------------------------------------------------------

   Supabase is the source of truth and archived IDs are

   included, so CRM IDs are never intentionally reused.

\========================================================= */

export async function generateNextClientId(): Promise<string> {
  const clients = await loadAllSupabaseClients();

  let maxNumber = 0;

  clients.forEach((client) => {
    const match = String(client.id).match(/^CL-(\d+)$/);

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      maxNumber = Math.max(maxNumber, number);
    }
  });

  return `CL-${String(maxNumber + 1).padStart(3, "0")}`;
}

/* =========================================================

   ASYNC SUPABASE LOOKUPS

\========================================================= */

export async function clientExistsInSupabase(id: string): Promise<boolean> {
  return Boolean(await loadClientByCrmId(id));
}

export async function getClientByPhoneFromSupabase(
  phone: string,
): Promise<Client | undefined> {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return undefined;
  }

  const clients = await loadAllSupabaseClients();

  return clients.find(
    (client) => normalizePhone(client.phone) === normalizedPhone,
  );
}

export async function getClientByEmailFromSupabase(
  email: string,
): Promise<Client | undefined> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return undefined;
  }

  const clients = await loadAllSupabaseClients();

  return clients.find(
    (client) => normalizeEmail(client.email) === normalizedEmail,
  );
}

export async function getClientByCompanyFromSupabase(
  company: string,
): Promise<Client | undefined> {
  const normalizedCompany = normalizeCompany(company);

  if (!normalizedCompany) {
    return undefined;
  }

  const clients = await loadAllSupabaseClients();

  return clients.find(
    (client) => normalizeCompany(client.company) === normalizedCompany,
  );
}

/* =========================================================

   REFRESH LOCAL COMPATIBILITY CACHE

\========================================================= */

export async function refreshClientCache(): Promise<Client[]> {
  const clients = await getClientsFromSupabase();

  saveClients(clients);

  return clients;
}

/* =========================================================

   GET CLIENT BY CRM ID

   ---------------------------------------------------------

   Temporary compatibility API.



   The page-level migration will later use Supabase

   directly/through an async store API.

\========================================================= */

export function getClientById(id: string): Client | undefined {
  const normalizedId = String(id || "").trim();

  if (!normalizedId) {
    return undefined;
  }

  const clients = getClients();

  return clients.find((client) => client.id === normalizedId);
}

/* =========================================================

   UPDATE CLIENT

\========================================================= */

export async function updateClient(updatedClient: Client): Promise<void> {
  const normalizedClient = normalizeClient(updatedClient);

  if (!normalizedClient.id) {
    throw new Error("Client CRM ID is required.");
  }

  if (!normalizedClient.company && !normalizedClient.contactPerson) {
    throw new Error("Please enter company name or contact person.");
  } /*

   \* Supabase is the source of truth. Do not depend on the

   \* browser cache to decide whether the client exists.

   */

  const existingClient = await loadClientByCrmId(normalizedClient.id);

  if (!existingClient) {
    throw new Error(`Client "${normalizedClient.id}" not found in Supabase.`);
  }

  const duplicate = await findDuplicateClientInSupabase(
    normalizedClient,

    existingClient.id,
  );

  if (duplicate) {
    throw new Error(
      `A client with similar details already exists: ${
        duplicate.company || duplicate.contactPerson
      } (${duplicate.id}).`,
    );
  }

  const clientToSave: Client = {
    ...normalizedClient,

    id: existingClient.id,

    archived: normalizedClient.archived === true,
  };

  const databaseId = await syncClientToSupabase(clientToSave);

  if (databaseId === null) {
    throw new Error(
      `Client "${clientToSave.id}" could not be safely linked to Supabase.`,
    );
  } /*

   \* LocalStorage is only a compatibility cache.

   */

  const cachedClients = getClients();

  if (cachedClients.some((client) => client.id === existingClient.id)) {
    saveClients(
      cachedClients.map((client) =>
        client.id === existingClient.id ? clientToSave : client,
      ),
    );
  } else {
    saveClients([...cachedClients, clientToSave]);
  }

  void createActivityLog({
    action: "UPDATE",

    module: "Clients",

    record_id: clientToSave.id,

    record_name: clientToSave.company,

    description: `Updated client "${clientToSave.company}"`,

    old_data: {
      company: existingClient.company,

      contactPerson: existingClient.contactPerson,

      phone: existingClient.phone,

      email: existingClient.email,

      address: existingClient.address,

      gst: existingClient.gst,

      services: existingClient.services,

      status: existingClient.status,

      archived: existingClient.archived ?? false,
    },

    new_data: {
      company: clientToSave.company,

      contactPerson: clientToSave.contactPerson,

      phone: clientToSave.phone,

      email: clientToSave.email,

      address: clientToSave.address,

      gst: clientToSave.gst,

      services: clientToSave.services,

      status: clientToSave.status,

      archived: clientToSave.archived ?? false,
    },
  });
}

/* =========================================================

   ADD CLIENT

   ---------------------------------------------------------

   IMPORTANT:

   Returns the real Supabase clients.id.



   Example:

   CRM ID      = CL-005

   Supabase ID = 45



   This is required because:

   leads.converted_client_id

   is a BIGINT FK to clients.id.

\========================================================= */

export async function addClient(client: Client): Promise<number> {
  const normalizedClient = normalizeClient(client);

  if (!normalizedClient.id) {
    throw new Error("Client CRM ID is required.");
  }

  if (!normalizedClient.company && !normalizedClient.contactPerson) {
    throw new Error("Please enter company name or contact person.");
  } /*

   \* CRM ID uniqueness is checked against Supabase.

   */

  const existingByCrmId = await loadClientByCrmId(normalizedClient.id);

  if (existingByCrmId) {
    throw new Error(`Client ID "${normalizedClient.id}" already exists.`);
  } /*

   \* Duplicate business details are also checked in Supabase.

   \* Archived records are included to preserve history.

   */

  const duplicate = await findDuplicateClientInSupabase(normalizedClient);

  if (duplicate) {
    throw new Error(
      `A client with similar details already exists: ${
        duplicate.company || duplicate.contactPerson
      } (${duplicate.id}).`,
    );
  }

  const newClient: Client = {
    ...normalizedClient,

    archived: false,
  };

  let databaseId: number | null = null;

  try {
    databaseId = await syncClientToSupabase(newClient);
  } catch (error) {
    console.error("Failed to create client in Supabase:", error);

    throw new Error(
      "Client could not be saved to the database. Please try again.",
    );
  }

  if (databaseId === null) {
    throw new Error(
      `Client "${newClient.company}" could not be safely linked to the database because multiple matching records already exist.`,
    );
  }

  const cachedClients = getClients();

  if (!cachedClients.some((item) => item.id === newClient.id)) {
    saveClients([...cachedClients, newClient]);
  }

  void createActivityLog({
    action: "CREATE",

    module: "Clients",

    record_id: newClient.id,

    record_name: newClient.company,

    description: `Created new client "${newClient.company}"`,

    new_data: {
      company: newClient.company,

      contactPerson: newClient.contactPerson,

      phone: newClient.phone,

      email: newClient.email,

      address: newClient.address,

      gst: newClient.gst,

      services: newClient.services,

      status: newClient.status,

      crmClientId: newClient.id,

      supabaseClientId: databaseId,
    },
  });

  return databaseId;
}

/* =========================================================

   ARCHIVE CLIENT

   ---------------------------------------------------------

   NEVER permanently delete.

\========================================================= */

export async function archiveClient(id: string): Promise<void> {
  const normalizedId = String(id || "").trim();

  if (!normalizedId) throw new Error("Client ID is required.");

  const existingClient = await loadClientByCrmId(normalizedId);
  if (!existingClient) {
    throw new Error(`Client "${normalizedId}" not found in Supabase.`);
  }

  if (existingClient.archived === true) return;

  const { error } = await supabase
    .from("clients")
    .update({ is_archived: true })
    .eq("crm_client_id", normalizedId);

  if (error) {
    console.error("Failed to archive client:", error);
    throw new Error(`Failed to archive client: ${error.message}`);
  }

  const archivedClient: Client = { ...existingClient, archived: true };
  const cachedClients = getClients();
  saveClients(
    cachedClients.map((client) =>
      client.id === normalizedId ? archivedClient : client,
    ),
  );

  void createActivityLog({
    action: "ARCHIVE",
    module: "Clients",
    record_id: existingClient.id,
    record_name: existingClient.company,
    description: `Archived client "${existingClient.company}"`,
    old_data: { archived: false, status: existingClient.status },
    new_data: { archived: true, status: existingClient.status },
  });
}

/* =========================================================
   RESTORE CLIENT
========================================================= */

export async function restoreClient(id: string): Promise<void> {
  const normalizedId = String(id || "").trim();

  if (!normalizedId) throw new Error("Client ID is required.");

  const existingClient = await loadClientByCrmId(normalizedId);
  if (!existingClient) {
    throw new Error(`Client "${normalizedId}" not found in Supabase.`);
  }

  if (existingClient.archived !== true) return;

  const duplicate = await findDuplicateClientInSupabase(
    existingClient,
    existingClient.id,
  );

  if (duplicate) {
    throw new Error(
      `Client cannot be restored because a similar record already exists: ${
        duplicate.company || duplicate.contactPerson
      } (${duplicate.id}).`,
    );
  }

  const { error } = await supabase
    .from("clients")
    .update({ is_archived: false })
    .eq("crm_client_id", normalizedId);

  if (error) {
    console.error("Failed to restore client:", error);
    throw new Error(`Failed to restore client: ${error.message}`);
  }

  const restoredClient: Client = { ...existingClient, archived: false };
  const cachedClients = getClients();
  saveClients([
    ...cachedClients.filter((client) => client.id !== normalizedId),
    restoredClient,
  ]);

  void createActivityLog({
    action: "RESTORE",
    module: "Clients",
    record_id: existingClient.id,
    record_name: existingClient.company,
    description: `Restored client "${existingClient.company}"`,
    old_data: { archived: true },
    new_data: { archived: false },
  });
}

/* =========================================================

   ACTIVE CLIENTS

\========================================================= */

export function getActiveClients(): Client[] {
  return getClients().filter((client) => client.archived !== true);
}

/* =========================================================

   ARCHIVED CLIENTS

\========================================================= */

export function getArchivedClients(): Client[] {
  return getClients().filter((client) => client.archived === true);
}

/* =========================================================

   CHECK CLIENT EXISTS

\========================================================= */

export function clientExists(id: string): boolean {
  const normalizedId = String(id || "").trim();

  if (!normalizedId) {
    return false;
  }

  return getClients().some((client) => client.id === normalizedId);
}

/* =========================================================

   GET CLIENT BY PHONE

\========================================================= */

export function getClientByPhone(phone: string): Client | undefined {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return undefined;
  }

  return getClients().find((client) => {
    const existingPhone = client.phone.replace(/\D/g, "");

    return existingPhone === normalizedPhone;
  });
}

/* =========================================================

   GET CLIENT BY EMAIL

\========================================================= */

export function getClientByEmail(email: string): Client | undefined {
  const normalizedEmail = String(email || "")
    .trim()

    .toLowerCase();

  if (!normalizedEmail) {
    return undefined;
  }

  return getClients().find(
    (client) => client.email.trim().toLowerCase() === normalizedEmail,
  );
}

/* =========================================================

   GET CLIENT BY COMPANY

\========================================================= */

export function getClientByCompany(company: string): Client | undefined {
  const normalizedCompany = String(company || "")
    .trim()

    .toLowerCase();

  if (!normalizedCompany) {
    return undefined;
  }

  return getClients().find(
    (client) => client.company.trim().toLowerCase() === normalizedCompany,
  );
}
