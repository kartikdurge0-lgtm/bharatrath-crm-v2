/* =========================================================
   INVOICE STORE
   Bharatrath CRM
   React + TypeScript
========================================================= */

import { createActivityLog } from "./activityLogStore";

/* =========================================================
   TYPES
========================================================= */

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type BillingFrequency = string;

/* =========================================================
   INVOICE ITEM
========================================================= */

export interface InvoiceItem {
  id: string;

  serviceId?: string;

  serviceName: string;

  description: string;

  sac: string;

  basicCost: number;

  discount: number;

  finalCost: number;

  frequency: BillingFrequency;
}

/* =========================================================
   PAYMENT
========================================================= */

export type PaymentStatus = "Active" | "Cancelled";

export interface InvoicePayment {
  id: string;

  invoiceId: string;

  paymentDate: string;

  amountPaid: number;

  paymentMode: string;

  transactionNumber?: string;

  paymentProof?: string;

  notes?: string;

  status: PaymentStatus;

  cancelledAt?: string;

  cancellationReason?: string;
}

/* =========================================================
   INVOICE
========================================================= */

export interface Invoice {
  id: string;

  invoiceNumber: string;

  clientId: string;

  clientName: string;

  clientContactPerson?: string;

  clientAddress?: string;

  clientGstNumber?: string;

  clientEmail?: string;

  clientPhone?: string;

  quotationId?: string;

  quotationNumber?: string;

  renewalId?: string;

  renewalReference?: string;

  invoiceDate: string;

  dueDate?: string;

  status: InvoiceStatus;

  items: InvoiceItem[];

  subtotal: number;

  tax: number;

  taxAmount: number;

  grandTotal: number;

  amount: number;

  notes?: string;

  payments: InvoicePayment[];

  createdAt: string;

  updatedAt: string;
}

/* =========================================================
   CREATE INPUT
========================================================= */

export interface CreateInvoiceInput {
  invoiceNumber?: string;

  clientId: string;

  clientName: string;

  clientContactPerson?: string;

  clientAddress?: string;

  clientGstNumber?: string;

  clientEmail?: string;

  clientPhone?: string;

  quotationId?: string;

  quotationNumber?: string;

  renewalId?: string;

  renewalReference?: string;

  invoiceDate: string;

  dueDate?: string;

  status?: InvoiceStatus;

  items: Partial<InvoiceItem>[];

  tax?: number;

  notes?: string;

  amount?: number;
}

/* =========================================================
   PAYMENT INPUT
========================================================= */

export interface AddPaymentInput {
  paymentDate: string;

  amountPaid: number;

  paymentMode: string;

  transactionNumber?: string;

  paymentProof?: string;

  notes?: string;
}

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "bharatrath_crm_invoices";

/* =========================================================
   HELPERS
========================================================= */

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* =========================================================
   GET ALL INVOICES
========================================================= */

export function getInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return (parsed as Invoice[]).map((invoice) => ({
      ...invoice,
      payments: Array.isArray(invoice.payments) ? invoice.payments : [],
    }));
  } catch (error) {
    console.error("Failed to load invoices:", error);

    return [];
  }
}

/* =========================================================
   SAVE INVOICES
========================================================= */

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

/* =========================================================
   GET SINGLE INVOICE
========================================================= */

export function getInvoiceById(invoiceId: string): Invoice | undefined {
  const invoices = getInvoices();

  return invoices.find((invoice) => invoice.id === invoiceId);
}

/* =========================================================
   GET SINGLE INVOICE
   Alias
========================================================= */

export function getInvoice(invoiceId: string): Invoice | undefined {
  return getInvoiceById(invoiceId);
}

/* =========================================================
   GET INVOICE BY RENEWAL
========================================================= */

export function getInvoiceByRenewalId(renewalId: string): Invoice | undefined {
  const invoices = getInvoices();

  return invoices.find((invoice) => invoice.renewalId === renewalId);
}

/* =========================================================
   GENERATE INVOICE ID
========================================================= */

export function generateInvoiceId(): string {
  const invoices = getInvoices();

  let highest = 0;

  invoices.forEach((invoice) => {
    const match = String(invoice.id).match(/^INV-(\d+)$/);

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (number > highest) {
      highest = number;
    }
  });

  return `INV-${String(highest + 1).padStart(3, "0")}`;
}

/* =========================================================
   GENERATE INVOICE NUMBER
========================================================= */

export function generateInvoiceNumber(): string {
  const invoices = getInvoices();

  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `INV/${month}/${year}/`;

  const existingNumbers = invoices
    .map((invoice) => invoice.invoiceNumber)
    .filter((number) => number.startsWith(prefix));

  let highestSerial = 0;

  existingNumbers.forEach((number) => {
    const parts = number.split("/");

    const serial = Number(parts[parts.length - 1]);

    if (!Number.isNaN(serial)) {
      highestSerial = Math.max(highestSerial, serial);
    }
  });

  return `${prefix}${String(highestSerial + 1).padStart(3, "0")}`;
}

/* =========================================================
   CALCULATE ITEM
========================================================= */

export function calculateItem(item: Partial<InvoiceItem>): InvoiceItem {
  const basicCost = Math.max(0, Number(item.basicCost) || 0);

  const discount = Math.min(basicCost, Math.max(0, Number(item.discount) || 0));

  const finalCost = Math.max(0, basicCost - discount);

  return {
    id: item.id || generateId("ITEM"),

    serviceId: item.serviceId,

    serviceName: item.serviceName || item.description || "",

    description: item.description || item.serviceName || "",

    sac: item.sac || "",

    basicCost: roundMoney(basicCost),

    discount: roundMoney(discount),

    finalCost: roundMoney(finalCost),

    frequency: item.frequency || "",
  };
}

/* =========================================================
   CALCULATE TOTALS
========================================================= */

export interface InvoiceTotals {
  subtotal: number;

  tax: number;

  taxAmount: number;

  grandTotal: number;
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxPercent: number,
): InvoiceTotals {
  const subtotal = roundMoney(
    items.reduce(
      (total: number, item: InvoiceItem) =>
        total + (Number(item.finalCost) || 0),
      0,
    ),
  );

  const tax = Math.max(0, Number(taxPercent) || 0);

  const taxAmount = roundMoney((subtotal * tax) / 100);

  const grandTotal = roundMoney(subtotal + taxAmount);

  return {
    subtotal,
    tax,
    taxAmount,
    grandTotal,
  };
}

/* =========================================================
   CREATE INVOICE
========================================================= */

export function createInvoice(input: CreateInvoiceInput): Invoice {
  const now = new Date().toISOString();

  const items = input.items
    .map((item) => calculateItem(item))
    .filter((item) => item.serviceName.trim() !== "");

  const totals = calculateInvoiceTotals(items, input.tax ?? 18);

  const invoice: Invoice = {
    id: generateInvoiceId(),

    invoiceNumber: input.invoiceNumber || generateInvoiceNumber(),

    clientId: input.clientId,

    clientName: input.clientName,

    clientContactPerson: input.clientContactPerson,

    clientAddress: input.clientAddress,

    clientGstNumber: input.clientGstNumber,

    clientEmail: input.clientEmail,

    clientPhone: input.clientPhone,

    quotationId: input.quotationId || undefined,

    quotationNumber: input.quotationNumber || undefined,

    renewalId: input.renewalId || undefined,

    renewalReference: input.renewalReference || undefined,

    invoiceDate: input.invoiceDate,

    dueDate: input.dueDate || undefined,

    status: input.status || "Draft",

    items,

    subtotal: totals.subtotal,

    tax: totals.tax,

    taxAmount: totals.taxAmount,

    grandTotal: totals.grandTotal,

    amount: totals.subtotal,

    notes: input.notes || "",

    payments: [],

    createdAt: now,

    updatedAt: now,
  };

  const invoices = getInvoices();

  invoices.push(invoice);

  saveInvoices(invoices);

  return invoice;
}

/* =========================================================
   ADD INVOICE
========================================================= */

export function addInvoice(invoice: Invoice): Invoice {
  const invoices = getInvoices();

  invoices.push(invoice);

  saveInvoices(invoices);

  return invoice;
}

/* =========================================================
   UPDATE INVOICE
========================================================= */

export function updateInvoice(
  invoiceId: string,
  updates: Partial<Invoice>,
): Invoice | undefined {
  const invoices = getInvoices();

  const index = invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index === -1) {
    return undefined;
  }

  const existing = invoices[index];

  /*
   * Cancelled invoices are retained permanently.
   */
  if (existing.status === "Cancelled" && updates.status !== "Cancelled") {
    return existing;
  }

  const updated: Invoice = {
    ...existing,

    ...updates,

    id: existing.id,

    createdAt: existing.createdAt,

    updatedAt: new Date().toISOString(),
  };

  /*
   * Recalculate financial totals whenever
   * items or tax changes.
   */
  if (updates.items !== undefined || updates.tax !== undefined) {
    const sourceItems = updates.items ?? existing.items;

    const items = sourceItems.map((item) => calculateItem(item));

    const tax = updates.tax ?? existing.tax;

    const totals = calculateInvoiceTotals(items, tax);

    updated.items = items;

    updated.subtotal = totals.subtotal;

    updated.tax = totals.tax;

    updated.taxAmount = totals.taxAmount;

    updated.grandTotal = totals.grandTotal;

    updated.amount = totals.subtotal;
  }

  invoices[index] = updated;

  saveInvoices(invoices);

  return updated;
}

/* =========================================================
   DELETE / ARCHIVE INVOICE
========================================================= */

export function deleteInvoice(invoiceId: string): boolean {
  const invoices = getInvoices();

  const index = invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index === -1) {
    return false;
  }

  const invoice = invoices[index];

  if (invoice.status === "Cancelled") {
    return true;
  }

  invoices[index] = {
    ...invoice,

    status: "Cancelled",

    updatedAt: new Date().toISOString(),
  };

  saveInvoices(invoices);

  return true;
}

/* =========================================================
   DUPLICATE INVOICE
========================================================= */

export function duplicateInvoice(invoiceId: string): Invoice | undefined {
  const invoice = getInvoiceById(invoiceId);

  if (!invoice) {
    return undefined;
  }

  return createInvoice({
    clientId: invoice.clientId,

    clientName: invoice.clientName,

    clientContactPerson: invoice.clientContactPerson,

    clientAddress: invoice.clientAddress,

    clientGstNumber: invoice.clientGstNumber,

    clientEmail: invoice.clientEmail,

    clientPhone: invoice.clientPhone,

    quotationId: invoice.quotationId,

    quotationNumber: invoice.quotationNumber,

    renewalId: undefined,

    renewalReference: undefined,

    invoiceDate: new Date().toISOString().split("T")[0],

    dueDate: invoice.dueDate,

    status: "Draft",

    items: invoice.items.map((item) => ({
      ...item,
      id: undefined,
    })),

    tax: invoice.tax,

    notes: invoice.notes,
  });
}

/* =========================================================
   ADD PAYMENT
========================================================= */

export function addInvoicePayment(
  invoiceId: string,
  input: AddPaymentInput,
): Invoice | undefined {
  const invoices = getInvoices();

  const index = invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index === -1) {
    return undefined;
  }

  const invoice = invoices[index];

  /*
   * Cancelled invoices cannot receive payments.
   */
  if (invoice.status === "Cancelled") {
    throw new Error("Payment cannot be added to a cancelled invoice.");
  }

  const paymentAmount = roundMoney(Number(input.amountPaid) || 0);

  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];

  const totalPaid = roundMoney(
    payments
      .filter((payment) => payment.status !== "Cancelled")
      .reduce((total, payment) => total + Number(payment.amountPaid || 0), 0),
  );

  const balance = roundMoney(invoice.grandTotal - totalPaid);

  if (balance <= 0) {
    throw new Error("This invoice is already fully paid.");
  }

  if (paymentAmount > balance) {
    throw new Error("Payment cannot be greater than outstanding balance.");
  }

  const payment: InvoicePayment = {
    id: generateId("PAY"),

    invoiceId,

    paymentDate: input.paymentDate,

    amountPaid: paymentAmount,

    paymentMode: input.paymentMode,

    transactionNumber: input.transactionNumber || "",

    paymentProof: input.paymentProof || "",

    notes: input.notes || "",

    status: "Active",
  };

  invoice.payments = [...payments, payment];

  const newTotalPaid = roundMoney(
    invoice.payments
      .filter((item) => item.status !== "Cancelled")
      .reduce((total, item) => total + Number(item.amountPaid || 0), 0),
  );

  /*
   * Payment controls financial status.
   */
  if (newTotalPaid >= invoice.grandTotal) {
    invoice.status = "Paid";
  } else if (newTotalPaid > 0) {
    invoice.status = "Partially Paid";
  } else {
    invoice.status =
      invoice.dueDate && new Date(invoice.dueDate) < new Date()
        ? "Overdue"
        : "Sent";
  }

  invoice.updatedAt = new Date().toISOString();

  invoices[index] = invoice;

  saveInvoices(invoices);

  /*
   * ACTIVITY HISTORY
   *
   * This is intentionally non-blocking.
   * If activity logging fails, payment is still saved.
   */
  void createActivityLog({
    action: "PAYMENT_ADDED",
    module: "Payments",
    record_id: invoice.invoiceNumber,
    record_name: invoice.clientName,
    description: `Added payment of ₹${paymentAmount.toLocaleString(
      "en-IN",
    )} to invoice ${invoice.invoiceNumber}`,
    new_data: {
      paymentId: payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amountPaid: paymentAmount,
      paymentMode: payment.paymentMode,
      paymentDate: payment.paymentDate,
      transactionNumber: payment.transactionNumber || "",
      totalPaid: newTotalPaid,
      outstandingBalance: Math.max(
        0,
        roundMoney(invoice.grandTotal - newTotalPaid),
      ),
      invoiceStatus: invoice.status,
    },
  });

  return invoice;
}

/* =========================================================
   CANCEL PAYMENT
   Payment remains permanently in history.
========================================================= */

export function cancelInvoicePayment(
  invoiceId: string,
  paymentId: string,
  cancellationReason: string = "Payment cancelled",
): Invoice | undefined {
  const invoices = getInvoices();

  const index = invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index === -1) {
    return undefined;
  }

  const invoice = invoices[index];

  const paymentIndex = invoice.payments.findIndex(
    (payment) => payment.id === paymentId,
  );

  if (paymentIndex === -1) {
    return undefined;
  }

  const payment = invoice.payments[paymentIndex];

  if (payment.status === "Cancelled") {
    return invoice;
  }

  /*
   * Payment is NEVER deleted.
   */
  invoice.payments[paymentIndex] = {
    ...payment,

    status: "Cancelled",

    cancelledAt: new Date().toISOString(),

    cancellationReason: cancellationReason.trim() || "Payment cancelled",
  };

  const activePayments = invoice.payments.filter(
    (item) => item.status !== "Cancelled",
  );

  const totalPaid = roundMoney(
    activePayments.reduce(
      (total, item) => total + Number(item.amountPaid || 0),
      0,
    ),
  );

  /*
   * Recalculate invoice status
   * after payment cancellation.
   */
  if (totalPaid <= 0) {
    if (
      invoice.status === "Paid" ||
      invoice.status === "Partially Paid" ||
      invoice.status === "Overdue"
    ) {
      invoice.status =
        invoice.dueDate && new Date(invoice.dueDate) < new Date()
          ? "Overdue"
          : "Sent";
    }
  } else if (totalPaid >= invoice.grandTotal) {
    invoice.status = "Paid";
  } else {
    invoice.status = "Partially Paid";
  }

  invoice.updatedAt = new Date().toISOString();

  invoices[index] = invoice;

  saveInvoices(invoices);

  /*
   * ACTIVITY HISTORY
   */
  void createActivityLog({
    action: "PAYMENT_CANCELLED",
    module: "Payments",
    record_id: invoice.invoiceNumber,
    record_name: invoice.clientName,
    description: `Cancelled payment of ₹${Number(
      payment.amountPaid || 0,
    ).toLocaleString("en-IN")} for invoice ${invoice.invoiceNumber}`,
    old_data: {
      paymentId: payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amountPaid: payment.amountPaid,
      paymentMode: payment.paymentMode,
      paymentDate: payment.paymentDate,
      status: payment.status,
    },
    new_data: {
      paymentId: payment.id,
      status: "Cancelled",
      cancellationReason: cancellationReason.trim() || "Payment cancelled",
      cancelledAt: invoice.updatedAt,
      totalPaid,
      outstandingBalance: Math.max(
        0,
        roundMoney(invoice.grandTotal - totalPaid),
      ),
      invoiceStatus: invoice.status,
    },
  });

  return invoice;
}

/* =========================================================
   LEGACY PAYMENT FUNCTION
========================================================= */

export function removeInvoicePayment(
  invoiceId: string,
  paymentId: string,
): Invoice | undefined {
  return cancelInvoicePayment(invoiceId, paymentId, "Payment cancelled");
}

/* =========================================================
   PAYMENT SUMMARY
========================================================= */

export interface InvoicePaymentSummary {
  totalPaid: number;

  balance: number;

  isPaid: boolean;
}

export function getInvoicePaymentSummary(
  invoice: Invoice,
): InvoicePaymentSummary {
  const activePayments = Array.isArray(invoice.payments)
    ? invoice.payments.filter((payment) => payment.status !== "Cancelled")
    : [];

  const totalPaid = roundMoney(
    activePayments.reduce(
      (total, payment) => total + Number(payment.amountPaid || 0),
      0,
    ),
  );

  const balance = Math.max(0, roundMoney(invoice.grandTotal - totalPaid));

  return {
    totalPaid,

    balance,

    isPaid: balance <= 0,
  };
}

/* =========================================================
   SEARCH INVOICES
========================================================= */

export function searchInvoices(
  searchTerm: string,
  status: InvoiceStatus | "All" = "All",
): Invoice[] {
  const invoices = getInvoices();

  const search = searchTerm.trim().toLowerCase();

  return invoices.filter((invoice) => {
    const matchesSearch =
      !search ||
      invoice.invoiceNumber.toLowerCase().includes(search) ||
      invoice.clientName.toLowerCase().includes(search) ||
      invoice.items.some((item) =>
        item.serviceName.toLowerCase().includes(search),
      );

    const matchesStatus = status === "All" || invoice.status === status;

    return matchesSearch && matchesStatus;
  });
}

/* =========================================================
   SORT INVOICES
========================================================= */

export function getInvoicesSorted(): Invoice[] {
  return [...getInvoices()].sort(
    (a, b) =>
      new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
  );
}

/* =========================================================
   INVOICE SUMMARY
========================================================= */

export interface InvoiceSummary {
  total: number;

  draft: number;

  sent: number;

  accepted: number;

  totalValue: number;

  totalPaid: number;

  outstanding: number;
}

export function getInvoiceSummary(): InvoiceSummary {
  const invoices = getInvoices();

  /*
   * Cancelled invoices remain in total history,
   * but are excluded from financial totals.
   */
  const activeInvoices = invoices.filter(
    (invoice) => invoice.status !== "Cancelled",
  );

  const total = invoices.length;

  const draft = activeInvoices.filter(
    (invoice) => invoice.status === "Draft",
  ).length;

  const sent = activeInvoices.filter(
    (invoice) => invoice.status === "Sent",
  ).length;

  const accepted = activeInvoices.filter(
    (invoice) => invoice.status === "Paid",
  ).length;

  const totalValue = roundMoney(
    activeInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal || 0),
      0,
    ),
  );

  const totalPaid = roundMoney(
    activeInvoices.reduce(
      (sum, invoice) =>
        sum +
        (Array.isArray(invoice.payments)
          ? invoice.payments
              .filter((payment) => payment.status !== "Cancelled")
              .reduce(
                (paymentTotal, payment) =>
                  paymentTotal + Number(payment.amountPaid || 0),
                0,
              )
          : 0),
      0,
    ),
  );

  const outstanding = Math.max(0, roundMoney(totalValue - totalPaid));

  return {
    total,

    draft,

    sent,

    accepted,

    totalValue,

    totalPaid,

    outstanding,
  };
}

/* =========================================================
   UPDATE OVERDUE INVOICES
========================================================= */

export function updateOverdueInvoices(): void {
  const invoices = getInvoices();

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let changed = false;

  invoices.forEach((invoice) => {
    /*
     * Paid and Cancelled invoices
     * should never become overdue.
     */
    if (invoice.status === "Paid" || invoice.status === "Cancelled") {
      return;
    }

    if (!invoice.dueDate) {
      return;
    }

    const dueDate = new Date(invoice.dueDate);

    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      const paymentSummary = getInvoicePaymentSummary(invoice);

      if (!paymentSummary.isPaid) {
        invoice.status = "Overdue";

        invoice.updatedAt = new Date().toISOString();

        changed = true;
      }
    }
  });

  if (changed) {
    saveInvoices(invoices);
  }
}

/* =========================================================
   CLEAR ALL INVOICES
   Development use only
========================================================= */

export function clearAllInvoices(): void {
  localStorage.removeItem(STORAGE_KEY);
}
