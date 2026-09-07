/* =========================================================
   QUOTATION STORE
   Bharatrath CRM

   Rules:
   1. Quotations are never permanently deleted.
   2. Archived quotations remain in storage/history.
   3. Active quotation searches/lists exclude archived records.
   4. Quotation numbers use the existing QUO-XXX format.
   5. Quotation number is immutable after creation.
   6. Totals are always recalculated by the store.
========================================================= */

import { createActivityLog } from "./activityLogStore";

/* =========================================================
   TYPES
========================================================= */

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

  leadId?: string;

  clientId: string;
  clientName: string;

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

  /* -------------------------------------------------------
     Archive
  ------------------------------------------------------- */

  isArchived?: boolean;
  archivedAt?: string;
};

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "crm-quotations";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_QUOTATION_PREFIX = "QUO-";

/* =========================================================
   HELPERS
========================================================= */

function isActiveQuotation(quotation: Quotation): boolean {
  return quotation.isArchived !== true;
}

function quotationRecordName(quotation: Quotation): string {
  return (
    String(quotation.quotationNumber || "").trim() ||
    String(quotation.clientName || "").trim() ||
    String(quotation.id || "").trim()
  );
}

function quotationDescription(quotation: Quotation, action: string): string {
  const name = quotationRecordName(quotation);

  switch (action) {
    case "CREATE":
      return `Created quotation "${name}" for "${quotation.clientName}"`;

    case "UPDATE":
      return `Updated quotation "${name}"`;

    case "STATUS_CHANGED":
      return `Changed quotation "${name}" status`;

    case "ARCHIVE":
      return `Archived quotation "${name}"`;

    default:
      return `${action} quotation "${name}"`;
  }
}

/* =========================================================
   NORMALIZE NUMBER
========================================================= */

function normalizeNumber(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

/* =========================================================
   NORMALIZE QUOTATION ITEMS
========================================================= */

function normalizeQuotationItems(
  items: QuotationItem[] | undefined,
): QuotationItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const basicCost = Math.max(0, normalizeNumber(item.basicCost));

    const discountedCost = Math.min(
      basicCost,
      Math.max(0, normalizeNumber(item.discountedCost)),
    );

    const finalCost = Math.max(0, basicCost - discountedCost);

    return {
      serviceId: String(item.serviceId || ""),

      description: String(item.description || ""),

      sac: String(item.sac || ""),

      basicCost,

      discountedCost,

      finalCost,

      frequency: String(item.frequency || ""),
    };
  });
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
   GET SINGLE ACTIVE QUOTATION
========================================================= */

export function getQuotation(id: string): Quotation | null {
  const quotations = getQuotations();

  return (
    quotations.find(
      (quotation) =>
        String(quotation.id) === String(id) && isActiveQuotation(quotation),
    ) || null
  );
}

/* =========================================================
   GET SINGLE QUOTATION INCLUDING ARCHIVED
   ---------------------------------------------------------
   Useful for history/detail/audit flows.

   This does NOT replace getQuotation().
   getQuotation() intentionally returns active records only.
========================================================= */

export function getQuotationIncludingArchived(id: string): Quotation | null {
  const quotations = getQuotations();

  return (
    quotations.find((quotation) => String(quotation.id) === String(id)) || null
  );
}

/* =========================================================
   GENERATE QUOTATION ID
   ---------------------------------------------------------
   Internal ID:
   QT-001
   QT-002
   QT-003

   Archived records are also considered.
========================================================= */

export function generateQuotationId(): string {
  const quotations = getQuotations();

  const usedNumbers = quotations
    .map((quotation) => {
      const match = String(quotation.id || "").match(/^QT-(\d+)$/i);

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => Number.isFinite(number) && number > 0);

  const highestNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;

  const nextNumber = highestNumber + 1;

  return `QT-${String(nextNumber).padStart(3, "0")}`;
}

/* =========================================================
   GET QUOTATION NUMBER PREFIX
========================================================= */

export function getQuotationNumberPrefix(): string {
  return DEFAULT_QUOTATION_PREFIX;
}

/* =========================================================
   GENERATE QUOTATION NUMBER
   ---------------------------------------------------------
   Current quotation format:
   QUO-001
   QUO-002
   QUO-003

   This function is primarily used for duplicate/system
   generated quotations.

   Normal AddQuotation creation continues to use the
   quotation settings screen's nextNumber flow.
========================================================= */

export function generateQuotationNumber(): string {
  const quotations = getQuotations();

  const prefix = DEFAULT_QUOTATION_PREFIX;

  let highestNumber = 0;

  for (const quotation of quotations) {
    const quotationNumber = String(quotation.quotationNumber || "").trim();

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const match = quotationNumber.match(
      new RegExp(`^${escapedPrefix}(\\d+)$`, "i"),
    );

    if (!match) {
      continue;
    }

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      highestNumber = Math.max(highestNumber, number);
    }
  }

  return `${prefix}${String(highestNumber + 1).padStart(3, "0")}`;
}

/* =========================================================
   ENSURE UNIQUE QUOTATION NUMBER
   ---------------------------------------------------------
   Protects against old/stale numbering settings.

   Example:
   Settings says QUO-005
   But QUO-005 already exists.

   Store will automatically move to the next free number.
========================================================= */

function ensureUniqueQuotationNumber(
  requestedNumber: string,
  quotations: Quotation[],
  ignoredId?: string,
): string {
  const requested = String(requestedNumber || "").trim();

  if (requested) {
    const duplicateExists = quotations.some(
      (quotation) =>
        String(quotation.id) !== String(ignoredId || "") &&
        String(quotation.quotationNumber || "")
          .trim()
          .toLowerCase() === requested.toLowerCase(),
    );

    if (!duplicateExists) {
      return requested;
    }
  }

  let generatedNumber = generateQuotationNumber();

  let duplicateGenerated = quotations.some(
    (quotation) =>
      String(quotation.quotationNumber || "")
        .trim()
        .toLowerCase() === generatedNumber.toLowerCase(),
  );

  while (duplicateGenerated) {
    const match = generatedNumber.match(/^QUO-(\d+)$/i);

    const nextNumber = match ? Number(match[1]) + 1 : quotations.length + 1;

    generatedNumber = `QUO-${String(nextNumber).padStart(3, "0")}`;

    duplicateGenerated = quotations.some(
      (quotation) =>
        String(quotation.quotationNumber || "")
          .trim()
          .toLowerCase() === generatedNumber.toLowerCase(),
    );
  }

  return generatedNumber;
}

/* =========================================================
   CALCULATE TOTALS
========================================================= */

export function calculateQuotationTotals(items: QuotationItem[], tax: number) {
  const normalizedItems = normalizeQuotationItems(items);

  const subtotal = normalizedItems.reduce((total, item) => {
    return total + item.finalCost;
  }, 0);

  const taxRate = Math.max(0, normalizeNumber(tax));

  const taxAmount = (subtotal * taxRate) / 100;

  const grandTotal = subtotal + taxAmount;

  return {
    subtotal,
    taxAmount,
    grandTotal,
  };
}

/* =========================================================
   ADD QUOTATION
========================================================= */

export function addQuotation(quotation: Quotation): Quotation {
  const quotations = getQuotations();

  const now = new Date().toISOString();

  const items = normalizeQuotationItems(quotation.items);

  const tax = Math.max(0, normalizeNumber(quotation.tax));

  const totals = calculateQuotationTotals(items, tax);

  /* -------------------------------------------------------
     Number
     -------------------------------------------------------
     If AddQuotation provides QUO-001, preserve it if unique.

     If the number is missing or already exists, generate a
     new unique number automatically.
  ------------------------------------------------------- */

  const quotationNumber = ensureUniqueQuotationNumber(
    quotation.quotationNumber,
    quotations,
  );

  const updatedQuotation: Quotation = {
    ...quotation,

    id: String(quotation.id || "").trim() || generateQuotationId(),

    quotationNumber,

    items,

    tax,

    ...totals,

    isArchived: false,

    archivedAt: undefined,

    createdAt: quotation.createdAt || now,

    updatedAt: now,
  };

  const updated = [...quotations, updatedQuotation];

  saveQuotations(updated);

  /* -------------------------------------------------------
     Activity Log
  ------------------------------------------------------- */

  void createActivityLog({
    action: "CREATE",

    module: "Quotations",

    record_id: updatedQuotation.id,

    record_name: quotationRecordName(updatedQuotation),

    description: quotationDescription(updatedQuotation, "CREATE"),

    new_data: updatedQuotation as unknown as Record<string, unknown>,
  });

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

  const existingQuotation = quotations.find(
    (quotation) =>
      String(quotation.id) === String(id) && isActiveQuotation(quotation),
  );

  if (!existingQuotation) {
    return null;
  }

  /* -------------------------------------------------------
     Quotation number is immutable.

     Even if some UI accidentally sends:
     { quotationNumber: "QUO-999" }

     it will be ignored.
  ------------------------------------------------------- */

  const mergedQuotation: Quotation = {
    ...existingQuotation,

    ...updates,

    id: existingQuotation.id,

    quotationNumber: existingQuotation.quotationNumber,

    isArchived: false,

    archivedAt: undefined,

    updatedAt: new Date().toISOString(),
  };

  const items = normalizeQuotationItems(mergedQuotation.items);

  const tax = Math.max(0, normalizeNumber(mergedQuotation.tax));

  const totals = calculateQuotationTotals(items, tax);

  const finalQuotation: Quotation = {
    ...mergedQuotation,

    items,

    tax,

    ...totals,
  };

  const updated = quotations.map((quotation) =>
    String(quotation.id) === String(id) ? finalQuotation : quotation,
  );

  saveQuotations(updated);

  const oldData = existingQuotation as unknown as Record<string, unknown>;

  const newData = finalQuotation as unknown as Record<string, unknown>;

  /* =======================================================
     STATUS CHANGE
  ======================================================= */

  if (existingQuotation.status !== finalQuotation.status) {
    void createActivityLog({
      action: "STATUS_CHANGED",

      module: "Quotations",

      record_id: finalQuotation.id,

      record_name: quotationRecordName(finalQuotation),

      description: `Changed quotation "${quotationRecordName(
        finalQuotation,
      )}" status from "${existingQuotation.status}" to "${finalQuotation.status}"`,

      old_data: oldData,

      new_data: newData,
    });
  }

  /* =======================================================
     GENERAL UPDATE
  ======================================================= */

  const updateKeys = Object.keys(updates).filter(
    (key) =>
      key !== "status" &&
      key !== "quotationNumber" &&
      key !== "id" &&
      key !== "createdAt" &&
      key !== "updatedAt" &&
      key !== "isArchived" &&
      key !== "archivedAt",
  );

  if (updateKeys.length > 0) {
    void createActivityLog({
      action: "UPDATE",

      module: "Quotations",

      record_id: finalQuotation.id,

      record_name: quotationRecordName(finalQuotation),

      description: quotationDescription(finalQuotation, "UPDATE"),

      old_data: oldData,

      new_data: newData,
    });
  }

  return finalQuotation;
}

/* =========================================================
   ARCHIVE QUOTATION
   ---------------------------------------------------------
   IMPORTANT:
   This is NOT a permanent delete.
========================================================= */

export function deleteQuotation(id: string): boolean {
  const quotations = getQuotations();

  const quotation = quotations.find(
    (item) => String(item.id) === String(id) && isActiveQuotation(item),
  );

  if (!quotation) {
    return false;
  }

  const now = new Date().toISOString();

  const archivedQuotation: Quotation = {
    ...quotation,

    isArchived: true,

    archivedAt: now,

    updatedAt: now,
  };

  const updated = quotations.map((item) =>
    String(item.id) === String(id) ? archivedQuotation : item,
  );

  saveQuotations(updated);

  /* -------------------------------------------------------
     Activity Log
  ------------------------------------------------------- */

  void createActivityLog({
    action: "ARCHIVE",

    module: "Quotations",

    record_id: archivedQuotation.id,

    record_name: quotationRecordName(archivedQuotation),

    description: quotationDescription(archivedQuotation, "ARCHIVE"),

    old_data: quotation as unknown as Record<string, unknown>,

    new_data: archivedQuotation as unknown as Record<string, unknown>,
  });

  return true;
}

/* =========================================================
   RESTORE ARCHIVED QUOTATION
   ---------------------------------------------------------
   Separate function so normal delete remains archive-only.
========================================================= */

export function restoreQuotation(id: string): Quotation | null {
  const quotations = getQuotations();

  const quotation = quotations.find(
    (item) => String(item.id) === String(id) && item.isArchived === true,
  );

  if (!quotation) {
    return null;
  }

  const now = new Date().toISOString();

  const restoredQuotation: Quotation = {
    ...quotation,

    isArchived: false,

    archivedAt: undefined,

    updatedAt: now,
  };

  const updated = quotations.map((item) =>
    String(item.id) === String(id) ? restoredQuotation : item,
  );

  saveQuotations(updated);

  void createActivityLog({
    action: "RESTORE",

    module: "Quotations",

    record_id: restoredQuotation.id,

    record_name: quotationRecordName(restoredQuotation),

    description: `Restored quotation "${quotationRecordName(
      restoredQuotation,
    )}"`,

    old_data: quotation as unknown as Record<string, unknown>,

    new_data: restoredQuotation as unknown as Record<string, unknown>,
  });

  return restoredQuotation;
}

/* =========================================================
   GET ARCHIVED QUOTATIONS
========================================================= */

export function getArchivedQuotations(): Quotation[] {
  return getQuotations().filter((quotation) => quotation.isArchived === true);
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

  /*
   * Generate the number before creating
   * the new record.
   */
  const quotationNumber = generateQuotationNumber();

  const newQuotation: Quotation = {
    ...quotation,

    id: generateQuotationId(),

    quotationNumber,

    quotationDate: now.split("T")[0],

    status: "Draft",

    isArchived: false,

    archivedAt: undefined,

    createdAt: now,

    updatedAt: now,
  };

  return addQuotation(newQuotation);
}

/* =========================================================
   GET ACTIVE QUOTATIONS BY CLIENT
========================================================= */

export function getQuotationsByClient(clientId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) =>
      isActiveQuotation(quotation) &&
      String(quotation.clientId) === String(clientId),
  );
}

/* =========================================================
   GET ACTIVE QUOTATIONS BY LEAD
========================================================= */

export function getQuotationsByLead(leadId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) =>
      isActiveQuotation(quotation) &&
      String(quotation.leadId || "") === String(leadId),
  );
}

/* =========================================================
   GET ACTIVE QUOTATIONS BY SALES PERSON
========================================================= */

export function getQuotationsBySalesPerson(salesPersonId: string): Quotation[] {
  return getQuotations().filter(
    (quotation) =>
      isActiveQuotation(quotation) &&
      String(quotation.salesPersonId || "") === String(salesPersonId),
  );
}

/* =========================================================
   GET ACTIVE QUOTATIONS BY STATUS
========================================================= */

export function getQuotationsByStatus(status: QuotationStatus): Quotation[] {
  return getQuotations().filter(
    (quotation) => isActiveQuotation(quotation) && quotation.status === status,
  );
}

/* =========================================================
   SEARCH ACTIVE QUOTATIONS
========================================================= */

export function searchQuotations(search: string): Quotation[] {
  const query = search.trim().toLowerCase();

  const activeQuotations = getQuotations().filter((quotation) =>
    isActiveQuotation(quotation),
  );

  if (!query) {
    return activeQuotations;
  }

  return activeQuotations.filter((quotation) => {
    const clientName = String(quotation.clientName || "").toLowerCase();

    const quotationNumber = String(
      quotation.quotationNumber || "",
    ).toLowerCase();

    const status = String(quotation.status || "").toLowerCase();

    const salesPersonName = String(
      quotation.salesPersonName || "",
    ).toLowerCase();

    const id = String(quotation.id || "").toLowerCase();

    const leadId = String(quotation.leadId || "").toLowerCase();

    return (
      clientName.includes(query) ||
      quotationNumber.includes(query) ||
      status.includes(query) ||
      salesPersonName.includes(query) ||
      id.includes(query) ||
      leadId.includes(query)
    );
  });
}

/* =========================================================
   GET QUOTATION STATISTICS
   ---------------------------------------------------------
   Only ACTIVE quotations are included.
========================================================= */

export function getQuotationStats() {
  const quotations = getQuotations().filter((quotation) =>
    isActiveQuotation(quotation),
  );

  const total = quotations.length;

  const draft = quotations.filter((q) => q.status === "Draft").length;

  const sent = quotations.filter((q) => q.status === "Sent").length;

  const accepted = quotations.filter((q) => q.status === "Accepted").length;

  const rejected = quotations.filter((q) => q.status === "Rejected").length;

  const expired = quotations.filter((q) => q.status === "Expired").length;

  const acceptedValue = quotations
    .filter((q) => q.status === "Accepted")
    .reduce((total, q) => total + normalizeNumber(q.grandTotal), 0);

  const pendingValue = quotations
    .filter((q) => q.status === "Sent" || q.status === "Draft")
    .reduce((total, q) => total + normalizeNumber(q.grandTotal), 0);

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
