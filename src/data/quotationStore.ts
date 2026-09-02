/* =========================================================
   QUOTATION STORE
   Bharatrath CRM
   ========================================================= */

/* ---------------------------------------------------------
   Types
--------------------------------------------------------- */

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired";

export type QuotationItem = {
  serviceId: string;

  description: string;
  sac: string;

  basicCost: number;
  discountedCost: number;
  finalCost: number;

  frequency: string;
};

export type Quotation = {
  id: string;

  /* -------------------------------------------------------
     CRM Relationships
  ------------------------------------------------------- */

  // Optional: quotation created from a Lead
  leadId?: string;

  // Client associated with quotation
  clientId: string;
  clientName: string;

  // Sales Person / person responsible for quotation
  salesPersonId?: string;
  salesPersonName?: string;

  /* -------------------------------------------------------
     Quotation Information
  ------------------------------------------------------- */

  quotationNumber: string;

  quotationDate: string;
  validUntil: string;

  status: QuotationStatus;

  /* -------------------------------------------------------
     Services
  ------------------------------------------------------- */

  items: QuotationItem[];

  /* -------------------------------------------------------
     Pricing
  ------------------------------------------------------- */

  tax: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;

  /* -------------------------------------------------------
     Additional Details
  ------------------------------------------------------- */

  scopeOfWork: string;
  implementationProcess: string;
  supportTraining: string;
  remarks: string;
  termsConditions: string;

  /* -------------------------------------------------------
     Meta
  ------------------------------------------------------- */

  createdAt: string;
  updatedAt?: string;
};

/* ---------------------------------------------------------
   Storage Key
--------------------------------------------------------- */

const STORAGE_KEY = "crm-quotations";

/* =========================================================
   CALCULATE TOTALS
========================================================= */

/*
  Basic Cost
  - Discount
  = Final Cost

  Subtotal
  + GST
  = Grand Total
*/

export function calculateQuotationTotals(items: QuotationItem[], tax: number) {
  const subtotal = items.reduce((total, item) => {
    const basicCost = Number(item.basicCost) || 0;

    const discount = Number(item.discountedCost) || 0;

    const finalCost = Math.max(0, basicCost - discount);

    return total + finalCost;
  }, 0);

  const taxAmount = (subtotal * (Number(tax) || 0)) / 100;

  const grandTotal = subtotal + taxAmount;

  return {
    subtotal,
    taxAmount,
    grandTotal,
  };
}

/* =========================================================
   GET ALL QUOTATIONS
========================================================= */

export function getQuotations(): Quotation[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Quotation[];
  } catch {
    return [];
  }
}

/* =========================================================
   SAVE ALL QUOTATIONS
========================================================= */

export function saveQuotations(quotations: Quotation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
}

/* =========================================================
   GET SINGLE QUOTATION
========================================================= */

export function getQuotation(id: string): Quotation | null {
  const quotations = getQuotations();

  return (
    quotations.find((quotation) => String(quotation.id) === String(id)) || null
  );
}

/* =========================================================
   GENERATE QUOTATION ID
========================================================= */

/*
  Example:

  QT-001
  QT-002
  QT-003

  Uses the highest existing number instead of
  quotations.length + 1.

  This prevents duplicate IDs when a quotation
  has previously been deleted.
*/

export function generateQuotationId(): string {
  const quotations = getQuotations();

  const numbers = quotations
    .map((quotation) => {
      const match = String(quotation.id).match(/^QT-(\d+)$/);

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `QT-${String(nextNumber).padStart(3, "0")}`;
}

/* =========================================================
   GENERATE QUOTATION NUMBER
========================================================= */

/*
  Format:

  QT/01/2026/001

  The sequence is based on the highest existing
  quotation number for the current format.
*/

export function generateQuotationNumber(): string {
  const quotations = getQuotations();

  const year = new Date().getFullYear();

  const numbers = quotations
    .map((quotation) => {
      const match = String(quotation.quotationNumber).match(
        /^QT\/01\/\d{4}\/(\d+)$/,
      );

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `QT/01/${year}/${String(nextNumber).padStart(3, "0")}`;
}

/* =========================================================
   ADD QUOTATION
========================================================= */

export function addQuotation(quotation: Quotation): Quotation {
  const quotations = getQuotations();

  const totals = calculateQuotationTotals(quotation.items, quotation.tax);

  const now = new Date().toISOString();

  const updatedQuotation: Quotation = {
    ...quotation,

    ...totals,

    createdAt: quotation.createdAt || now,

    updatedAt: now,
  };

  const updated = [...quotations, updatedQuotation];

  saveQuotations(updated);

  return updatedQuotation;
}

/* =========================================================
   UPDATE QUOTATION
========================================================= */

export function updateQuotation(
  id: string,
  updates: Partial<Quotation>,
): Quotation | null {
  const quotations = getQuotations();

  let updatedQuotation: Quotation | null = null;

  const updated = quotations.map((quotation) => {
    if (String(quotation.id) !== String(id)) {
      return quotation;
    }

    const merged: Quotation = {
      ...quotation,
      ...updates,
    };

    const totals = calculateQuotationTotals(merged.items, merged.tax);

    updatedQuotation = {
      ...merged,

      ...totals,

      updatedAt: new Date().toISOString(),
    };

    return updatedQuotation;
  });

  if (!updatedQuotation) {
    return null;
  }

  saveQuotations(updated);

  return updatedQuotation;
}

/* =========================================================
   DELETE QUOTATION
========================================================= */

export function deleteQuotation(id: string): boolean {
  const quotations = getQuotations();

  const exists = quotations.some(
    (quotation) => String(quotation.id) === String(id),
  );

  if (!exists) {
    return false;
  }

  const updated = quotations.filter(
    (quotation) => String(quotation.id) !== String(id),
  );

  saveQuotations(updated);

  return true;
}

/* =========================================================
   UPDATE STATUS
========================================================= */

export function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
): Quotation | null {
  return updateQuotation(id, {
    status,
  });
}

/* =========================================================
   MARK AS SENT
========================================================= */

export function markQuotationAsSent(id: string): Quotation | null {
  return updateQuotationStatus(id, "Sent");
}

/* =========================================================
   ACCEPT
========================================================= */

export function acceptQuotation(id: string): Quotation | null {
  return updateQuotationStatus(id, "Accepted");
}

/* =========================================================
   REJECT
========================================================= */

export function rejectQuotation(id: string): Quotation | null {
  return updateQuotationStatus(id, "Rejected");
}

/* =========================================================
   EXPIRE
========================================================= */

export function expireQuotation(id: string): Quotation | null {
  return updateQuotationStatus(id, "Expired");
}

/* =========================================================
   DUPLICATE QUOTATION
========================================================= */

export function duplicateQuotation(id: string): Quotation | null {
  const quotation = getQuotation(id);

  if (!quotation) {
    return null;
  }

  const now = new Date().toISOString();

  const newQuotation: Quotation = {
    ...quotation,

    id: generateQuotationId(),

    quotationNumber: generateQuotationNumber(),

    quotationDate: now.split("T")[0],

    status: "Draft",

    createdAt: now,

    updatedAt: now,
  };

  return addQuotation(newQuotation);
}

/* =========================================================
   GET BY CLIENT
========================================================= */

export function getQuotationsByClient(clientId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) => String(quotation.clientId) === String(clientId),
  );
}

/* =========================================================
   GET BY LEAD
========================================================= */

export function getQuotationsByLead(leadId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) => String(quotation.leadId || "") === String(leadId),
  );
}

/* =========================================================
   GET BY SALES PERSON
========================================================= */

export function getQuotationsBySalesPerson(salesPersonId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) =>
      String(quotation.salesPersonId || "") === String(salesPersonId),
  );
}

/* =========================================================
   GET BY STATUS
========================================================= */

export function getQuotationsByStatus(status: QuotationStatus): Quotation[] {
  return getQuotations().filter((quotation) => quotation.status === status);
}

/* =========================================================
   SEARCH
========================================================= */

export function searchQuotations(search: string): Quotation[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return getQuotations();
  }

  return getQuotations().filter(
    (quotation) =>
      quotation.clientName.toLowerCase().includes(query) ||
      quotation.quotationNumber.toLowerCase().includes(query) ||
      quotation.status.toLowerCase().includes(query) ||
      (quotation.salesPersonName || "").toLowerCase().includes(query),
  );
}

/* =========================================================
   STATISTICS
========================================================= */

export function getQuotationStats() {
  const quotations = getQuotations();

  const total = quotations.length;

  const draft = quotations.filter((q) => q.status === "Draft").length;

  const sent = quotations.filter((q) => q.status === "Sent").length;

  const accepted = quotations.filter((q) => q.status === "Accepted").length;

  const rejected = quotations.filter((q) => q.status === "Rejected").length;

  const expired = quotations.filter((q) => q.status === "Expired").length;

  const acceptedValue = quotations
    .filter((q) => q.status === "Accepted")
    .reduce((total, q) => total + Number(q.grandTotal || 0), 0);

  const pendingValue = quotations
    .filter((q) => q.status === "Sent" || q.status === "Draft")
    .reduce((total, q) => total + Number(q.grandTotal || 0), 0);

  return {
    total,
    draft,
    sent,
    accepted,
    rejected,
    expired,
    acceptedValue,
    pendingValue,
  };
}
