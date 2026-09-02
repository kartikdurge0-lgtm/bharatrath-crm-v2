export type LeadStatus =
  | "New"
  | "Contacted"
  | "Follow-up"
  | "Quotation Sent"
  | "Negotiation"
  | "Won"
  | "Lost";

export type LeadPriority = "High" | "Medium" | "Low";

export type LeadSource =
  | "Website"
  | "WhatsApp"
  | "Facebook"
  | "Instagram"
  | "Referral"
  | "Event"
  | "Existing Client"
  | "Cold Call"
  | "Other";

export type CommissionStatus =
  | "Not Applicable"
  | "Pending"
  | "Approved"
  | "Paid";

export type Lead = {
  id: string;

  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;

  leadSource: LeadSource;
  sourceDetails: string;

  // Person who generated/referred the lead
  assignedTo: string;

  // Bharatrath team member who will handle follow-ups
  followUpAssignedTo: string;

  referencePersonName: string;
  referencePersonPhone: string;
  referencePersonEmail: string;

  commissionApplicable: boolean;
  commissionPercent: number;
  commissionAmount: number;
  commissionStatus: CommissionStatus;
  commissionPaidDate?: string;

  requirement: string;
  interestedService: string;

  priority: LeadPriority;
  status: LeadStatus;

  expectedValue: number;
  expectedClosingDate: string;

  notes: string;
  internalNotes: string;

  nextFollowUpDate: string;
  nextFollowUpTime: string;
  nextAction: string;

  createdAt: string;
  updatedAt?: string;
  convertedAt?: string;
  convertedClientId?: string;
  lostReason?: string;
};

const STORAGE_KEY = "crm-leads";

export function getLeads(): Lead[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((lead) => {
      const item = lead as Partial<Lead>;

      return {
        ...item,
        followUpAssignedTo: item.followUpAssignedTo ?? "",
        convertedClientId: item.convertedClientId ?? "",
      } as Lead;
    });
  } catch {
    return [];
  }
}

export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function getLead(id: string): Lead | null {
  return getLeads().find((lead) => lead.id === id) ?? null;
}

export function generateLeadId(): string {
  const leads = getLeads();

  const numbers = leads
    .map((lead) => {
      const match = lead.id.match(/LEAD-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `LEAD-${String(nextNumber).padStart(3, "0")}`;
}

export function addLead(lead: Lead): Lead {
  const leads = getLeads();

  leads.push(lead);

  saveLeads(leads);

  return lead;
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const leads = getLeads();

  const index = leads.findIndex((lead) => lead.id === id);

  if (index === -1) {
    return null;
  }

  const updatedLead: Lead = {
    ...leads[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  leads[index] = updatedLead;

  saveLeads(leads);

  return updatedLead;
}

export function updateLeadStatus(id: string, status: LeadStatus): Lead | null {
  return updateLead(id, {
    status,
  });
}

export function calculateCommission(
  expectedValue: number,
  commissionPercent: number,
): number {
  if (!Number.isFinite(expectedValue) || !Number.isFinite(commissionPercent)) {
    return 0;
  }

  return Math.round((expectedValue * commissionPercent) / 100);
}

export function updateLeadCommission(
  id: string,
  commissionPercent: number,
  commissionApplicable: boolean,
): Lead | null {
  const lead = getLead(id);

  if (!lead) {
    return null;
  }

  const commissionAmount = commissionApplicable
    ? calculateCommission(lead.expectedValue, commissionPercent)
    : 0;

  return updateLead(id, {
    commissionApplicable,
    commissionPercent,
    commissionAmount,
    commissionStatus: commissionApplicable ? "Pending" : "Not Applicable",
  });
}

export function markCommissionPaid(id: string): Lead | null {
  return updateLead(id, {
    commissionStatus: "Paid",
    commissionPaidDate: new Date().toISOString(),
  });
}

export function markLeadWon(id: string): Lead | null {
  return updateLead(id, {
    status: "Won",
    convertedAt: new Date().toISOString(),
  });
}

export function markLeadLost(id: string, lostReason: string): Lead | null {
  return updateLead(id, {
    status: "Lost",
    lostReason,
  });
}

export function deleteLead(id: string): boolean {
  const leads = getLeads();

  const exists = leads.some((lead) => lead.id === id);

  if (!exists) {
    return false;
  }

  const updatedLeads = leads.filter((lead) => lead.id !== id);

  saveLeads(updatedLeads);

  return true;
}
