export type RenewalStatus = "Upcoming" | "Due Soon" | "Overdue" | "Completed";

export type Renewal = {
  id: string;

  clientId: string;
  clientName: string;

  service: string;

  renewalDate: string;

  amount: number;

  status: RenewalStatus;

  notes?: string;

  createdAt: string;

  completedAt?: string;
};

const STORAGE_KEY = "crm-renewals";

/* ---------------------------------------
   Get all renewals
--------------------------------------- */

export function getRenewals(): Renewal[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Renewal[];
  } catch {
    return [];
  }
}

/* ---------------------------------------
   Save all renewals
--------------------------------------- */

export function saveRenewals(renewals: Renewal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(renewals));
}

/* ---------------------------------------
   Get single renewal
--------------------------------------- */

export function getRenewal(id: string): Renewal | null {
  const renewals = getRenewals();

  return renewals.find((renewal) => renewal.id === id) || null;
}

/* ---------------------------------------
   Generate Renewal ID
--------------------------------------- */

export function generateRenewalId(): string {
  const renewals = getRenewals();

  let maxNumber = 0;

  renewals.forEach((renewal) => {
    const match = renewal.id.match(/^REN-(\d+)$/);

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (number > maxNumber) {
      maxNumber = number;
    }
  });

  return `REN-${String(maxNumber + 1).padStart(3, "0")}`;
}

/* ---------------------------------------
   Add renewal
--------------------------------------- */

export function addRenewal(renewal: Renewal): Renewal {
  const renewals = getRenewals();

  const updated = [...renewals, renewal];

  saveRenewals(updated);

  return renewal;
}

/* ---------------------------------------
   Update renewal
--------------------------------------- */

export function updateRenewal(
  id: string,
  updates: Partial<Renewal>,
): Renewal | null {
  const renewals = getRenewals();

  let updatedRenewal: Renewal | null = null;

  const updated = renewals.map((renewal) => {
    if (renewal.id !== id) {
      return renewal;
    }

    updatedRenewal = {
      ...renewal,
      ...updates,
    };

    return updatedRenewal;
  });

  if (!updatedRenewal) {
    return null;
  }

  saveRenewals(updated);

  return updatedRenewal;
}

/* ---------------------------------------
   Complete renewal
--------------------------------------- */

export function completeRenewal(id: string): Renewal | null {
  return updateRenewal(id, {
    status: "Completed",
    completedAt: new Date().toISOString(),
  });
}

/* ---------------------------------------
   Delete renewal
--------------------------------------- */

export function deleteRenewal(id: string): boolean {
  const renewals = getRenewals();

  const exists = renewals.some((renewal) => renewal.id === id);

  if (!exists) {
    return false;
  }

  const updated = renewals.filter((renewal) => renewal.id !== id);

  saveRenewals(updated);

  return true;
}
