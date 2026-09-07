import { createActivityLog } from "./activityLogStore";
import { supabase } from "../lib/supabase";

/* =========================================================
   CLIENT TYPE
========================================================= */

export type Client = {
  id: string;

  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gst: string;
  services: string;
  status: string;

  archived?: boolean;
};

/* =========================================================
   DEFAULT CLIENTS
========================================================= */

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

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "crm-clients";

/* =========================================================
   LOCAL STORAGE
========================================================= */

export function getClients(): Client[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));

    return defaultClients;
  }

  try {
    const clients: unknown = JSON.parse(saved);

    if (!Array.isArray(clients)) {
      throw new Error("Invalid clients data");
    }

    return clients.map((client) => {
      const item = client as Client;

      return {
        ...item,

        archived:
          item.archived === true || (item.archived as unknown) === "true",
      };
    });
  } catch (error) {
    console.error("Failed to load clients:", error);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));

    return defaultClients;
  }
}

/* =========================================================
   SAVE CLIENTS
========================================================= */

export function saveClients(clients: Client[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

/* =========================================================
   SUPABASE CLIENT DATA
========================================================= */

function getSupabaseClientData(client: Client) {
  return {
    crm_client_id: client.id,

    company_name: client.company,

    contact_person: client.contactPerson || null,

    phone: client.phone || null,

    email: client.email || null,

    address: client.address || null,

    gst_number: client.gst || null,

    notes: client.services || null,

    status: client.status || "Active",

    is_archived: client.archived === true,
  };
}

/* =========================================================
   FIND SUPABASE CLIENT BY CRM ID
========================================================= */

/*
 * Primary relationship:
 *
 * CRM:
 * CL-005
 *
 * Supabase:
 * crm_client_id = CL-005
 *
 * This is now the primary lookup.
 */

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

  return Number.isFinite(databaseId) ? databaseId : null;
}

/* =========================================================
   FIND CRM CLIENT ID BY SUPABASE ID
========================================================= */

/*
 * Used when reading Lead records.
 *
 * Supabase Lead:
 * converted_client_id = 45
 *
 * Supabase Client:
 * id = 45
 * crm_client_id = CL-005
 *
 * Frontend Lead:
 * convertedClientId = CL-005
 */

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
   SYNC CLIENT TO SUPABASE
========================================================= */

/*
 * IMPORTANT
 *
 * Never use company name as the primary relationship.
 *
 * Primary:
 * crm_client_id
 *
 * Legacy fallback:
 * company_name
 *
 * The fallback is allowed only when exactly ONE
 * matching company exists.
 *
 * If multiple company rows exist, we DO NOT guess.
 */

async function syncClientToSupabase(client: Client): Promise<number | null> {
  try {
    const clientData = getSupabaseClientData(client);

    /* -----------------------------------------------------
       1. PRIMARY LOOKUP — CRM CLIENT ID
    ----------------------------------------------------- */

    const { data: existingByCrmId, error: crmLookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("crm_client_id", client.id)
      .maybeSingle();

    if (crmLookupError) {
      console.error("Client CRM ID lookup error:", crmLookupError);

      throw crmLookupError;
    }

    /* -----------------------------------------------------
       2. UPDATE EXISTING CLIENT BY CRM ID
    ----------------------------------------------------- */

    if (existingByCrmId) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", existingByCrmId.id);

      if (updateError) {
        console.error("Client Supabase update error:", updateError);

        throw updateError;
      }

      return Number(existingByCrmId.id);
    }

    /* -----------------------------------------------------
       3. LEGACY FALLBACK — COMPANY NAME
    ----------------------------------------------------- */

    const { data: companyMatches, error: companyLookupError } = await supabase
      .from("clients")
      .select("id, crm_client_id")
      .eq("company_name", client.company)
      .limit(2);

    if (companyLookupError) {
      console.error("Client company lookup error:", companyLookupError);

      throw companyLookupError;
    }

    /* -----------------------------------------------------
       4. EXACTLY ONE LEGACY MATCH
    ----------------------------------------------------- */

    if (companyMatches && companyMatches.length === 1) {
      const existing = companyMatches[0];

      const { error: updateError } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", existing.id);

      if (updateError) {
        console.error("Legacy client migration update error:", updateError);

        throw updateError;
      }

      console.info(
        `Linked legacy client "${client.company}" to CRM ID ${client.id}.`,
      );

      return Number(existing.id);
    }

    /* -----------------------------------------------------
       5. MULTIPLE LEGACY MATCHES
    ----------------------------------------------------- */

    if (companyMatches && companyMatches.length > 1) {
      console.warn(
        `Multiple Supabase clients found for company "${client.company}". ` +
          `CRM ID "${client.id}" was not automatically linked.`,
      );

      return null;
    }

    /* -----------------------------------------------------
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
    console.error("Client Supabase sync exception:", error);

    throw error;
  }
}

/* =========================================================
   SYNC ALL CLIENTS
========================================================= */

async function syncAllClientsToSupabase(): Promise<void> {
  const clients = getClients();

  let successCount = 0;

  let skippedCount = 0;

  for (const client of clients) {
    try {
      const databaseId = await syncClientToSupabase(client);

      if (databaseId !== null) {
        successCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`Failed to sync client ${client.id}:`, error);
    }
  }

  console.log(
    `Client sync completed. ${successCount} synced, ${skippedCount} skipped.`,
  );
}

/* =========================================================
   GET CLIENT BY CRM ID
========================================================= */

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
========================================================= */

export async function updateClient(updatedClient: Client): Promise<void> {
  const clients = getClients();

  const existingClient = clients.find(
    (client) => client.id === updatedClient.id,
  );

  if (!existingClient) {
    throw new Error(`Client "${updatedClient.id}" not found.`);
  }

  /*
   * CRM client ID is immutable.
   */
  const clientToSave: Client = {
    ...updatedClient,

    id: existingClient.id,

    archived: updatedClient.archived === true,
  };

  /* -------------------------------------------------------
     SUPABASE FIRST
  ------------------------------------------------------- */

  await syncClientToSupabase(clientToSave);

  /* -------------------------------------------------------
     LOCAL STORAGE
  ------------------------------------------------------- */

  const updatedClients = clients.map((client) =>
    client.id === existingClient.id ? clientToSave : client,
  );

  saveClients(updatedClients);

  /* -------------------------------------------------------
     ACTIVITY
  ------------------------------------------------------- */

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
========================================================= */

/*
 * IMPORTANT
 *
 * This function is now async.
 *
 * It returns the real Supabase clients.id.
 *
 * Example:
 *
 * CRM ID:
 * CL-005
 *
 * Supabase ID:
 * 45
 *
 * This is required because:
 *
 * leads.converted_client_id
 *
 * is a BIGINT foreign key pointing to:
 *
 * clients.id
 */

export async function addClient(client: Client): Promise<number> {
  const clients = getClients();

  /* -------------------------------------------------------
     DUPLICATE CRM ID PROTECTION
  ------------------------------------------------------- */

  const existingCrmId = clients.find((item) => item.id === client.id);

  if (existingCrmId) {
    throw new Error(`Client ID "${client.id}" already exists.`);
  }

  const newClient: Client = {
    ...client,

    archived: false,
  };

  /* -------------------------------------------------------
     SUPABASE FIRST
  ------------------------------------------------------- */

  let databaseId: number | null = null;

  try {
    databaseId = await syncClientToSupabase(newClient);
  } catch (error) {
    console.error("Failed to create client in Supabase:", error);

    throw new Error(
      "Client could not be saved to the database. Please try again.",
    );
  }

  /*
   * Multiple legacy company matches cannot safely be
   * linked automatically.
   */
  if (databaseId === null) {
    throw new Error(
      `Client "${newClient.company}" could not be safely linked to the database because multiple matching records already exist.`,
    );
  }

  /* -------------------------------------------------------
     LOCAL STORAGE
  ------------------------------------------------------- */

  saveClients([...clients, newClient]);

  /* -------------------------------------------------------
     ACTIVITY
  ------------------------------------------------------- */

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
========================================================= */

export async function archiveClient(id: string): Promise<void> {
  const clients = getClients();

  const existingClient = clients.find((client) => client.id === id);

  if (!existingClient) {
    return;
  }

  const archivedClient: Client = {
    ...existingClient,

    archived: true,
  };

  /* -------------------------------------------------------
     SUPABASE FIRST
  ------------------------------------------------------- */

  await syncClientToSupabase(archivedClient);

  /* -------------------------------------------------------
     LOCAL STORAGE
  ------------------------------------------------------- */

  const updatedClients = clients.map((client) =>
    client.id === id ? archivedClient : client,
  );

  saveClients(updatedClients);

  /* -------------------------------------------------------
     ACTIVITY
  ------------------------------------------------------- */

  void createActivityLog({
    action: "ARCHIVE",

    module: "Clients",

    record_id: existingClient.id,

    record_name: existingClient.company,

    description: `Archived client "${existingClient.company}"`,

    old_data: {
      archived: existingClient.archived ?? false,
      status: existingClient.status,
    },

    new_data: {
      archived: true,
      status: existingClient.status,
    },
  });
}

/* =========================================================
   RESTORE CLIENT
========================================================= */

export async function restoreClient(id: string): Promise<void> {
  const clients = getClients();

  const existingClient = clients.find((client) => client.id === id);

  if (!existingClient) {
    return;
  }

  const restoredClient: Client = {
    ...existingClient,

    archived: false,
  };

  /* -------------------------------------------------------
     SUPABASE FIRST
  ------------------------------------------------------- */

  await syncClientToSupabase(restoredClient);

  /* -------------------------------------------------------
     LOCAL STORAGE
  ------------------------------------------------------- */

  const updatedClients = clients.map((client) =>
    client.id === id ? restoredClient : client,
  );

  saveClients(updatedClients);

  /* -------------------------------------------------------
     ACTIVITY
  ------------------------------------------------------- */

  void createActivityLog({
    action: "UPDATE",

    module: "Clients",

    record_id: existingClient.id,

    record_name: existingClient.company,

    description: `Restored client "${existingClient.company}"`,

    old_data: {
      archived: true,
    },

    new_data: {
      archived: false,
    },
  });
}

/* =========================================================
   BACKGROUND INITIAL SYNC
========================================================= */

export function initializeClientSync(): void {
  void syncAllClientsToSupabase();
}
