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

const STORAGE_KEY = "crm-sales-persons";

const DEFAULT_SALES_PERSONS: SalesPerson[] = [
  {
    id: "SP-001",
    name: "Vijay",
    mobile: "",
    email: "",
    type: "Staff",
    commissionPercent: 0,
    status: "Active",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "SP-002",
    name: "Alok",
    mobile: "",
    email: "",
    type: "Staff",
    commissionPercent: 0,
    status: "Active",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "SP-003",
    name: "Kartik",
    mobile: "",
    email: "",
    type: "Staff",
    commissionPercent: 0,
    status: "Active",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "SP-004",
    name: "Sandesh",
    mobile: "",
    email: "",
    type: "Staff",
    commissionPercent: 0,
    status: "Active",
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

export function getSalesPersons(): SalesPerson[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SALES_PERSONS));

    return DEFAULT_SALES_PERSONS;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return DEFAULT_SALES_PERSONS;
    }

    return parsed as SalesPerson[];
  } catch {
    return DEFAULT_SALES_PERSONS;
  }
}

export function saveSalesPersons(salesPersons: SalesPerson[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salesPersons));
}

export function getSalesPerson(id: string): SalesPerson | null {
  return getSalesPersons().find((salesPerson) => salesPerson.id === id) ?? null;
}

export function generateSalesPersonId(): string {
  const salesPersons = getSalesPersons();

  const numbers = salesPersons
    .map((salesPerson) => {
      const match = salesPerson.id.match(/SP-(\d+)/);

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `SP-${String(nextNumber).padStart(3, "0")}`;
}

export function addSalesPerson(salesPerson: SalesPerson): SalesPerson {
  const salesPersons = getSalesPersons();

  salesPersons.push(salesPerson);

  saveSalesPersons(salesPersons);

  return salesPerson;
}

export function updateSalesPerson(
  id: string,
  updates: Partial<SalesPerson>,
): SalesPerson | null {
  const salesPersons = getSalesPersons();

  const index = salesPersons.findIndex((salesPerson) => salesPerson.id === id);

  if (index === -1) {
    return null;
  }

  const updatedSalesPerson: SalesPerson = {
    ...salesPersons[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  salesPersons[index] = updatedSalesPerson;

  saveSalesPersons(salesPersons);

  return updatedSalesPerson;
}

export function deactivateSalesPerson(id: string): SalesPerson | null {
  return updateSalesPerson(id, {
    status: "Inactive",
  });
}

export function activateSalesPerson(id: string): SalesPerson | null {
  return updateSalesPerson(id, {
    status: "Active",
  });
}

export function deleteSalesPerson(id: string): boolean {
  const salesPersons = getSalesPersons();

  const exists = salesPersons.some((salesPerson) => salesPerson.id === id);

  if (!exists) {
    return false;
  }

  const updatedSalesPersons = salesPersons.filter(
    (salesPerson) => salesPerson.id !== id,
  );

  saveSalesPersons(updatedSalesPersons);

  return true;
}

export function getActiveSalesPersons(): SalesPerson[] {
  return getSalesPersons().filter(
    (salesPerson) => salesPerson.status === "Active",
  );
}

export function getInternalTeamMembers(): SalesPerson[] {
  return getActiveSalesPersons().filter(
    (person) => person.type === "Staff" || person.type === "Part-time",
  );
}
