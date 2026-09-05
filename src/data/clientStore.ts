import { createActivityLog } from "./activityLogStore";
import { supabase } from "../lib/supabase";

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
   LOCAL STORAGE
========================================================= */

export function getClients(): Client[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));
    return defaultClients;
  }

  try {
    const clients = JSON.parse(saved);

    if (!Array.isArray(clients)) {
      throw new Error("Invalid clients data");
    }

    return clients.map((client: Client) => ({
      ...client,
      archived:
        client.archived === true || (client.archived as unknown) === "true",
    }));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));
    return defaultClients;
  }
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

/* =========================================================
   SUPABASE SYNC
========================================================= */

/*
 * Sync local client with Supabase.
 *
 * IMPORTANT:
 * Local IDs such as CL-001 are NOT used as Supabase IDs.
 * We identify the client using company_name.
 *
 * Supabase clients table uses:
 * phone
 * NOT mobile
 */
async function syncClientToSupabase(client: Client): Promise<number | null> {
  try {
    /* -----------------------------------------------------
       1. Find existing client by company name
    ----------------------------------------------------- */

    const { data: existing, error: findError } = await supabase
      .from("clients")
      .select("id")
      .eq("company_name", client.company)
      .maybeSingle();

    if (findError) {
      console.error("Client lookup error:", findError);
      return null;
    }

    /* -----------------------------------------------------
       2. Prepare Supabase data
    ----------------------------------------------------- */

    const clientData = {
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

    /* -----------------------------------------------------
       3. Update existing client
    ----------------------------------------------------- */

    if (existing) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", existing.id);

      if (updateError) {
        console.error("Client Supabase update error:", updateError);
        return null;
      }

      return Number(existing.id);
    }

    /* -----------------------------------------------------
       4. Create new client
    ----------------------------------------------------- */

    const { data: created, error: createError } = await supabase
      .from("clients")
      .insert(clientData)
      .select("id")
      .single();

    if (createError) {
      console.error("Client Supabase insert error:", createError);
      return null;
    }

    return created ? Number(created.id) : null;
  } catch (error) {
    console.error("Client Supabase sync exception:", error);
    return null;
  }
}

/* =========================================================
   SYNC ALL CLIENTS
========================================================= */

async function syncAllClientsToSupabase() {
  const clients = getClients();

  for (const client of clients) {
    await syncClientToSupabase(client);
  }

  console.log(
    `Client sync completed. ${clients.length} local clients processed.`,
  );
}

/* =========================================================
   GET CLIENT
========================================================= */

export function getClientById(id: string): Client | undefined {
  const clients = getClients();

  return clients.find((client) => client.id === id);
}

/* =========================================================
   UPDATE CLIENT
========================================================= */

export function updateClient(updatedClient: Client) {
  const clients = getClients();

  const existingClient = clients.find(
    (client) => client.id === updatedClient.id,
  );

  if (!existingClient) {
    return;
  }

  const updatedClients = clients.map((client) =>
    client.id === updatedClient.id ? updatedClient : client,
  );

  saveClients(updatedClients);

  void syncClientToSupabase(updatedClient);

  void createActivityLog({
    action: "UPDATE",
    module: "Clients",
    record_id: updatedClient.id,
    record_name: updatedClient.company,
    description: `Updated client "${updatedClient.company}"`,
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
      company: updatedClient.company,
      contactPerson: updatedClient.contactPerson,
      phone: updatedClient.phone,
      email: updatedClient.email,
      address: updatedClient.address,
      gst: updatedClient.gst,
      services: updatedClient.services,
      status: updatedClient.status,
      archived: updatedClient.archived ?? false,
    },
  });
}

/* =========================================================
   ADD CLIENT
========================================================= */

export function addClient(client: Client) {
  const clients = getClients();

  const newClient: Client = {
    ...client,
    archived: false,
  };

  saveClients([...clients, newClient]);

  void syncClientToSupabase(newClient);

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
    },
  });
}

/* =========================================================
   ARCHIVE CLIENT
========================================================= */

export function archiveClient(id: string) {
  const clients = getClients();

  const existingClient = clients.find((client) => client.id === id);

  if (!existingClient) {
    return;
  }

  const archivedClient: Client = {
    ...existingClient,
    archived: true,
  };

  const updatedClients = clients.map((client) =>
    client.id === id ? archivedClient : client,
  );

  saveClients(updatedClients);

  void syncClientToSupabase(archivedClient);

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

export function restoreClient(id: string) {
  const clients = getClients();

  const existingClient = clients.find((client) => client.id === id);

  if (!existingClient) {
    return;
  }

  const restoredClient: Client = {
    ...existingClient,
    archived: false,
  };

  const updatedClients = clients.map((client) =>
    client.id === id ? restoredClient : client,
  );

  saveClients(updatedClients);

  void syncClientToSupabase(restoredClient);

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

export function initializeClientSync() {
  void syncAllClientsToSupabase();
}
