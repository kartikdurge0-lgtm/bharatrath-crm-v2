import { createActivityLog } from "./activityLogStore";

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

  // Soft archive — record is never permanently deleted
  isArchived?: boolean;
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

  return (
    renewals.find((renewal) => renewal.id === id && !renewal.isArchived) || null
  );
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

  const newRenewal: Renewal = {
    ...renewal,
    isArchived: false,
  };

  const updated = [...renewals, newRenewal];

  saveRenewals(updated);

  /* ---------------------------------------
     ACTIVITY: RENEWAL CREATED
  --------------------------------------- */

  void createActivityLog({
    action: "CREATE",
    module: "Renewals",
    record_id: newRenewal.id,
    record_name: `${newRenewal.clientName} - ${newRenewal.service}`,
    description: `Created renewal for "${newRenewal.clientName}" - ${newRenewal.service}`,
    new_data: newRenewal as unknown as Record<string, unknown>,
  });

  return newRenewal;
}

/* ---------------------------------------
   Update renewal
--------------------------------------- */

export function updateRenewal(
  id: string,
  updates: Partial<Renewal>,
): Renewal | null {
  const renewals = getRenewals();

  const index = renewals.findIndex(
    (renewal) => renewal.id === id && !renewal.isArchived,
  );

  if (index === -1) {
    return null;
  }

  const existingRenewal = renewals[index];

  const updatedRenewal: Renewal = {
    ...existingRenewal,
    ...updates,
  };

  renewals[index] = updatedRenewal;

  saveRenewals(renewals);

  const oldData = existingRenewal as unknown as Record<string, unknown>;

  const newData = updatedRenewal as unknown as Record<string, unknown>;

  const recordName = `${updatedRenewal.clientName} - ${updatedRenewal.service}`;

  /* ---------------------------------------
     ACTIVITY: STATUS CHANGED
  --------------------------------------- */

  if (existingRenewal.status !== updatedRenewal.status) {
    void createActivityLog({
      action: "STATUS_CHANGED",
      module: "Renewals",
      record_id: updatedRenewal.id,
      record_name: recordName,
      description: `Changed renewal "${recordName}" status from "${existingRenewal.status}" to "${updatedRenewal.status}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  /* ---------------------------------------
     ACTIVITY: GENERAL UPDATE
  --------------------------------------- */

  const updateKeys = Object.keys(updates).filter((key) => key !== "status");

  if (updateKeys.length > 0) {
    void createActivityLog({
      action: "UPDATE",
      module: "Renewals",
      record_id: updatedRenewal.id,
      record_name: recordName,
      description: `Updated renewal "${recordName}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

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
   Delete / Archive renewal
--------------------------------------- */

export function deleteRenewal(id: string): boolean {
  const renewals = getRenewals();

  const index = renewals.findIndex(
    (renewal) => renewal.id === id && !renewal.isArchived,
  );

  if (index === -1) {
    return false;
  }

  const existingRenewal = renewals[index];

  /*
   * SOFT DELETE
   * Record remains in localStorage.
   */
  const archivedRenewal: Renewal = {
    ...existingRenewal,
    isArchived: true,
  };

  renewals[index] = archivedRenewal;

  saveRenewals(renewals);

  /* ---------------------------------------
     ACTIVITY: ARCHIVE
  --------------------------------------- */

  void createActivityLog({
    action: "ARCHIVE",
    module: "Renewals",
    record_id: archivedRenewal.id,
    record_name: `${archivedRenewal.clientName} - ${archivedRenewal.service}`,
    description: `Archived renewal "${archivedRenewal.clientName} - ${archivedRenewal.service}"`,
    old_data: existingRenewal as unknown as Record<string, unknown>,
    new_data: archivedRenewal as unknown as Record<string, unknown>,
  });

  return true;
}
