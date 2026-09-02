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

export function getClients(): Client[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultClients));
    return defaultClients;
  }

  try {
    const clients = JSON.parse(saved);

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

export function getClientById(id: string): Client | undefined {
  const clients = getClients();

  return clients.find((client) => client.id === id);
}

export function updateClient(updatedClient: Client) {
  const clients = getClients();

  const updatedClients = clients.map((client) =>
    client.id === updatedClient.id ? updatedClient : client,
  );

  saveClients(updatedClients);
}

export function addClient(client: Client) {
  const clients = getClients();

  saveClients([
    ...clients,
    {
      ...client,
      archived: false,
    },
  ]);
}

export function archiveClient(id: string) {
  const clients = getClients();

  const updatedClients = clients.map((client) =>
    client.id === id
      ? {
          ...client,
          archived: true,
        }
      : client,
  );

  saveClients(updatedClients);
}

export function restoreClient(id: string) {
  const clients = getClients();

  const updatedClients = clients.map((client) =>
    client.id === id
      ? {
          ...client,
          archived: false,
        }
      : client,
  );

  saveClients(updatedClients);
}
