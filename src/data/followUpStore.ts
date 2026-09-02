export type FollowUpStatus = "Pending" | "Completed";

export type FollowUpPriority = "High" | "Medium" | "Low";

export type FollowUpRelatedType = "Lead" | "Client" | "Quotation" | "Renewal";

export type FollowUp = {
  id: string;

  // What this follow-up is related to
  relatedType?: FollowUpRelatedType;
  relatedId?: string;
  relatedName?: string;

  // Client fields - retained for existing follow-ups
  clientId: string;
  clientName: string;
  contactPerson: string;
  phone: string;

  purpose: string;
  followUpType: string;

  followUpDate: string;
  followUpTime: string;

  priority: FollowUpPriority;

  assignedTo: string;

  reminder: string;

  nextFollowUpDate: string;
  nextFollowUpTime: string;

  nextAction: string;

  notes: string;
  clientResponse: string;
  internalNotes: string;

  status: FollowUpStatus;

  completedAt?: string;

  createdAt: string;
};

const STORAGE_KEY = "crm-follow-ups";

/* =========================================================
   GET ALL FOLLOW-UPS
========================================================= */

export function getFollowUps(): FollowUp[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as FollowUp[];
  } catch {
    return [];
  }
}

/* =========================================================
   SAVE ALL FOLLOW-UPS
========================================================= */

export function saveFollowUps(followUps: FollowUp[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(followUps));
}

/* =========================================================
   GET SINGLE FOLLOW-UP
========================================================= */

export function getFollowUp(id: string): FollowUp | null {
  return getFollowUps().find((followUp) => followUp.id === id) ?? null;
}

/* =========================================================
   GENERATE FOLLOW-UP ID
========================================================= */

export function generateFollowUpId(): string {
  const followUps = getFollowUps();

  const numbers = followUps
    .map((followUp) => {
      const match = followUp.id.match(/FU-(\d+)/);

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `FU-${String(nextNumber).padStart(3, "0")}`;
}

/* =========================================================
   ADD FOLLOW-UP
========================================================= */

export function addFollowUp(followUp: FollowUp): FollowUp {
  const followUps = getFollowUps();

  followUps.push(followUp);

  saveFollowUps(followUps);

  return followUp;
}

/* =========================================================
   UPDATE FOLLOW-UP
========================================================= */

export function updateFollowUp(
  id: string,
  updates: Partial<FollowUp>,
): FollowUp | null {
  const followUps = getFollowUps();

  const index = followUps.findIndex((followUp) => followUp.id === id);

  if (index === -1) {
    return null;
  }

  const updatedFollowUp: FollowUp = {
    ...followUps[index],
    ...updates,
  };

  followUps[index] = updatedFollowUp;

  saveFollowUps(followUps);

  return updatedFollowUp;
}

/* =========================================================
   COMPLETE FOLLOW-UP
========================================================= */

export function completeFollowUp(id: string): FollowUp | null {
  return updateFollowUp(id, {
    status: "Completed",
    completedAt: new Date().toISOString(),
  });
}

/* =========================================================
   REOPEN FOLLOW-UP
========================================================= */

export function reopenFollowUp(id: string): FollowUp | null {
  return updateFollowUp(id, {
    status: "Pending",
    completedAt: undefined,
  });
}

/* =========================================================
   DELETE FOLLOW-UP
========================================================= */

export function deleteFollowUp(id: string): boolean {
  const followUps = getFollowUps();

  const exists = followUps.some((followUp) => followUp.id === id);

  if (!exists) {
    return false;
  }

  const updatedFollowUps = followUps.filter((followUp) => followUp.id !== id);

  saveFollowUps(updatedFollowUps);

  return true;
}

/* =========================================================
   GET FOLLOW-UPS BY RELATED RECORD
========================================================= */

export function getFollowUpsByRelatedRecord(
  relatedType: FollowUpRelatedType,
  relatedId: string,
): FollowUp[] {
  return getFollowUps().filter(
    (followUp) =>
      followUp.relatedType === relatedType && followUp.relatedId === relatedId,
  );
}

/* =========================================================
   GET FOLLOW-UPS BY LEAD
========================================================= */

export function getLeadFollowUps(leadId: string): FollowUp[] {
  return getFollowUpsByRelatedRecord("Lead", leadId);
}

/* =========================================================
   GET FOLLOW-UPS BY CLIENT
========================================================= */

export function getClientFollowUps(clientId: string): FollowUp[] {
  return getFollowUpsByRelatedRecord("Client", clientId);
}

/* =========================================================
   GET FOLLOW-UPS BY QUOTATION
========================================================= */

export function getQuotationFollowUps(quotationId: string): FollowUp[] {
  return getFollowUpsByRelatedRecord("Quotation", quotationId);
}

/* =========================================================
   GET FOLLOW-UPS BY RENEWAL
========================================================= */

export function getRenewalFollowUps(renewalId: string): FollowUp[] {
  return getFollowUpsByRelatedRecord("Renewal", renewalId);
}

/* =========================================================
   GET PENDING FOLLOW-UPS
========================================================= */

export function getPendingFollowUps(): FollowUp[] {
  return getFollowUps().filter((followUp) => followUp.status === "Pending");
}

/* =========================================================
   GET COMPLETED FOLLOW-UPS
========================================================= */

export function getCompletedFollowUps(): FollowUp[] {
  return getFollowUps().filter((followUp) => followUp.status === "Completed");
}

/* =========================================================
   GET TODAY'S FOLLOW-UPS
========================================================= */

export function getTodayFollowUps(): FollowUp[] {
  const today = new Date().toISOString().split("T")[0];

  return getFollowUps().filter(
    (followUp) =>
      followUp.followUpDate === today && followUp.status === "Pending",
  );
}

/* =========================================================
   GET OVERDUE FOLLOW-UPS
========================================================= */

export function getOverdueFollowUps(): FollowUp[] {
  const today = new Date().toISOString().split("T")[0];

  return getFollowUps().filter(
    (followUp) =>
      followUp.followUpDate < today && followUp.status === "Pending",
  );
}
