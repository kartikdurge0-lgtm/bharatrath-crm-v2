/* =========================================================
   INVOICE STORE
   Bharatrath CRM
   PHASE 2 — SUPABASE SOURCE OF TRUTH
========================================================= */

import { supabase } from "../lib/supabase";
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

export interface AddPaymentInput {
  paymentDate: string;
  amountPaid: number;
  paymentMode: string;
  transactionNumber?: string;
  paymentProof?: string;
  notes?: string;
}

/* =========================================================
   DATABASE ROW SHAPES
========================================================= */

type AnyRow = Record<string, unknown>;

type ClientRow = {
  id: number;
  crm_client_id: string | null;
  company_name: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst?: string | null;
  gst_number?: string | null;
};

type InvoiceDbRow = AnyRow & {
  id: number;
  client_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  quotation_id: number | null;
  renewal_id: number | null;
  service_name: string | null;
  amount: number | null;
  tax: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  grand_total: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type InvoiceItemDbRow = AnyRow & {
  id: number;
  invoice_id: number;
  service_name: string;
  description?: string | null;
  sac: string | null;
  basic_cost: number | null;
  discount: number | null;
  final_cost: number | null;
  frequency: string | null;
  created_at: string;
};

type PaymentDbRow = AnyRow & {
  id: number;
  invoice_id: number;
  client_id: number;
  payment_date: string;
  amount: number | null;
  payment_method: string;
  transaction_reference: string | null;
  payment_proof?: string | null;
  status: string | null;
  notes: string | null;
  received_by: string | null;
  created_at: string;
  updated_at: string;
};

const DISPLAY_ID_PREFIX = "INV";
const PAYMENT_META_PREFIX = "__BDP_PAYMENT_CANCELLED__";

/* =========================================================
   GENERIC HELPERS
========================================================= */

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value: unknown): InvoiceStatus {
  switch (String(value || "")) {
    case "Draft":
      return "Draft";
    case "Sent":
      return "Sent";
    case "Partially Paid":
      return "Partially Paid";
    case "Paid":
      return "Paid";
    case "Overdue":
      return "Overdue";
    case "Cancelled":
      return "Cancelled";
    default:
      return "Draft";
  }
}

function formatDisplayId(id: number): string {
  return `${DISPLAY_ID_PREFIX}-${String(id).padStart(3, "0")}`;
}

function getDatabaseId(displayId: string): number | null {
  const match = String(displayId || "")
    .trim()
    .match(/^INV-(\d+)$/i);

  if (!match) {
    const numeric = Number(displayId);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getClientDatabaseId(clientId: string): number | null {
  const value = String(clientId || "").trim();

  const match = value.match(/^CL-(\d+)$/i);

  if (match) {
    const id = Number(match[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getRelatedDatabaseId(displayId?: string): number | null {
  const value = String(displayId || "").trim();

  if (!value) return null;

  const match = value.match(/^[A-Z]+-(\d+)$/i);

  if (!match) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getClientSerial(clientId: string): string {
  const match = String(clientId || "")
    .trim()
    .match(/(\d+)$/);
  return match ? String(Number(match[1])).padStart(3, "0") : "000";
}

function invoiceRecordName(invoice: Invoice): string {
  return invoice.invoiceNumber || invoice.id;
}

function isValidDate(value?: string): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

/* =========================================================
   PAYMENT CANCELLATION METADATA
   No schema change is required because the existing
   payments.notes column is used to retain audit metadata.
========================================================= */

function encodeCancelledPaymentNotes(
  originalNotes: string | undefined,
  cancelledAt: string,
  reason: string,
): string {
  return [
    PAYMENT_META_PREFIX,
    cancelledAt,
    encodeURIComponent(reason),
    encodeURIComponent(originalNotes || ""),
  ].join("|");
}

function decodeCancelledPaymentNotes(notes: unknown): {
  notes: string;
  cancelledAt?: string;
  cancellationReason?: string;
} {
  const value = String(notes || "");

  if (!value.startsWith(`${PAYMENT_META_PREFIX}|`)) {
    return { notes: value };
  }

  const parts = value.split("|");

  const cancelledAt = parts[1] || undefined;
  const reason = parts[2] ? decodeURIComponent(parts[2]) : "Payment cancelled";
  const originalNotes = parts[3] ? decodeURIComponent(parts[3]) : "";

  return {
    notes: originalNotes,
    cancelledAt,
    cancellationReason: reason,
  };
}

/* =========================================================
   ITEM HELPERS
========================================================= */

function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateItem(item: Partial<InvoiceItem>): InvoiceItem {
  const basicCost = Math.max(0, normalizeNumber(item.basicCost));
  const discount = Math.min(
    basicCost,
    Math.max(0, normalizeNumber(item.discount)),
  );
  const finalCost = Math.max(0, basicCost - discount);

  return {
    id: item.id || generateLocalId("ITEM"),
    serviceId: item.serviceId ? String(item.serviceId) : undefined,
    serviceName: String(item.serviceName || item.description || "").trim(),
    description: String(item.description || item.serviceName || "").trim(),
    sac: String(item.sac || "").trim(),
    basicCost: roundMoney(basicCost),
    discount: roundMoney(discount),
    finalCost: roundMoney(finalCost),
    frequency: String(item.frequency || "").trim(),
  };
}

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
    items.reduce((sum, item) => sum + normalizeNumber(item.finalCost), 0),
  );

  const tax = Math.max(0, normalizeNumber(taxPercent));
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
   CLIENT LOOKUPS
========================================================= */

async function getClientRows(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, crm_client_id, company_name, contact_person, phone, email, address",
    );

  if (error) {
    throw new Error(`Failed to load clients: ${error.message}`);
  }

  return (data || []) as ClientRow[];
}

async function getClientMap(): Promise<Map<number, ClientRow>> {
  const rows = await getClientRows();
  return new Map(rows.map((row) => [row.id, row]));
}

async function resolveClientDatabaseId(clientId: string): Promise<number> {
  const direct = getClientDatabaseId(clientId);

  if (direct) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("id", direct)
      .maybeSingle();

    if (!error && data) {
      return Number(data.id);
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, crm_client_id")
    .eq("crm_client_id", String(clientId).trim())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve client: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Client "${clientId}" was not found in Supabase.`);
  }

  return Number(data.id);
}

/* =========================================================
   INVOICE NUMBERING
========================================================= */

export type InvoiceNumberPrefix = "BDP" | "QTN" | "REN";

function getInvoicePrefix(input: CreateInvoiceInput): InvoiceNumberPrefix {
  return input.renewalId || input.renewalReference ? "REN" : "BDP";
}

function getInvoiceNumberPrefix(
  clientId: string,
  prefix: InvoiceNumberPrefix,
  invoiceDate?: string,
): string {
  const date = invoiceDate ? new Date(invoiceDate) : new Date();
  const year = date.getFullYear();
  const clientSerial = getClientSerial(clientId);

  return `${prefix}-${clientSerial}-${year}-`;
}

function getHighestInvoiceSerial(
  invoiceNumbers: string[],
  numberPrefix: string,
): number {
  let highest = 0;

  for (const value of invoiceNumbers) {
    const invoiceNumber = String(value || "").trim();

    if (!invoiceNumber.startsWith(numberPrefix)) continue;

    const parts = invoiceNumber.split("-");

    if (parts.length !== 4) continue;

    const serial = Number(parts[3]);

    if (Number.isFinite(serial)) {
      highest = Math.max(highest, serial);
    }
  }

  return highest;
}

export async function generateInvoiceNumber(
  clientId: string,
  prefix: InvoiceNumberPrefix = "BDP",
  invoiceDate?: string,
): Promise<string> {
  const numberPrefix = getInvoiceNumberPrefix(clientId, prefix, invoiceDate);

  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .ilike("invoice_number", `${numberPrefix}%`);

  if (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }

  const highest = getHighestInvoiceSerial(
    (data || []).map((row) => String(row.invoice_number || "")),
    numberPrefix,
  );

  return `${numberPrefix}${String(highest + 1).padStart(3, "0")}`;
}

/* =========================================================
   ROW → UI MAPPING
========================================================= */

function mapItemRow(row: InvoiceItemDbRow): InvoiceItem {
  const rawServiceId = row.service_id;
  const unitPrice = roundMoney(normalizeNumber(row.unit_price));
  const finalCost = roundMoney(normalizeNumber(row.amount));
  const quantity = Math.max(0, normalizeNumber(row.quantity) || 1);

  return {
    id: `ITEM-${row.id}`,
    serviceId:
      rawServiceId !== undefined && rawServiceId !== null
        ? String(rawServiceId)
        : undefined,
    serviceName: String(row.description || "").trim(),
    description: String(row.description || "").trim(),
    sac: "",
    basicCost: roundMoney(unitPrice * quantity),
    discount: roundMoney(Math.max(0, unitPrice * quantity - finalCost)),
    finalCost,
    frequency: "",
  };
}

function mapPaymentRow(row: PaymentDbRow): InvoicePayment {
  const meta = decodeCancelledPaymentNotes(row.notes);

  return {
    id: `PAY-${row.id}`,
    invoiceId: formatDisplayId(Number(row.invoice_id)),
    paymentDate: String(row.payment_date || ""),
    amountPaid: roundMoney(normalizeNumber(row.amount)),
    paymentMode: String(row.payment_method || ""),
    transactionNumber: row.transaction_reference || "",
    paymentProof: row.payment_proof || "",
    notes: meta.notes,
    status:
      String(row.status || "Received") === "Cancelled" ? "Cancelled" : "Active",
    cancelledAt: meta.cancelledAt,
    cancellationReason: meta.cancellationReason,
  };
}

async function mapInvoiceRow(
  row: InvoiceDbRow,
  clientMap: Map<number, ClientRow>,
  itemRows: InvoiceItemDbRow[],
  paymentRows: PaymentDbRow[],
): Promise<Invoice> {
  const client = clientMap.get(Number(row.client_id));

  const storedItems = Array.isArray(row.items) ? row.items : [];
  const items =
    storedItems.length > 0
      ? storedItems.map((item: unknown, index: number) => {
          const value = item as Record<string, unknown>;
          return calculateItem({
            id: String(value.id || `ITEM-${row.id}-${index + 1}`),
            serviceId: value.serviceId ? String(value.serviceId) : undefined,
            serviceName: String(value.serviceName || value.description || ""),
            description: String(value.description || value.serviceName || ""),
            sac: String(value.sac || ""),
            basicCost: normalizeNumber(value.basicCost),
            discount: normalizeNumber(value.discount),
            finalCost: normalizeNumber(value.finalCost),
            frequency: String(value.frequency || ""),
          });
        })
      : itemRows.map(mapItemRow);
  const payments = paymentRows.map(mapPaymentRow);

  const clientName =
    client?.company_name || String(row.client_name || "") || "Unknown Client";

  const quotationId =
    row.quotation_id !== null && row.quotation_id !== undefined
      ? `QT-${String(row.quotation_id).padStart(3, "0")}`
      : undefined;

  const renewalId =
    row.renewal_id !== null && row.renewal_id !== undefined
      ? `REN-${String(row.renewal_id).padStart(3, "0")}`
      : undefined;

  const tax = normalizeNumber(row.tax);
  const subtotal = roundMoney(normalizeNumber(row.subtotal));
  const taxAmount = roundMoney(
    row.tax_amount !== null && row.tax_amount !== undefined
      ? normalizeNumber(row.tax_amount)
      : (subtotal * tax) / 100,
  );
  const grandTotal = roundMoney(
    row.grand_total !== null && row.grand_total !== undefined
      ? normalizeNumber(row.grand_total)
      : subtotal + taxAmount,
  );

  return {
    id: formatDisplayId(Number(row.id)),
    invoiceNumber: String(row.invoice_number || ""),

    clientId:
      client?.crm_client_id || `CL-${String(row.client_id).padStart(3, "0")}`,
    clientName,

    clientContactPerson:
      client?.contact_person ||
      (typeof row.client_contact_person === "string"
        ? row.client_contact_person
        : undefined),
    clientAddress:
      client?.address ||
      (typeof row.client_address === "string" ? row.client_address : undefined),
    clientGstNumber:
      typeof row.client_gst_number === "string"
        ? row.client_gst_number
        : undefined,
    clientEmail:
      client?.email ||
      (typeof row.client_email === "string" ? row.client_email : undefined),
    clientPhone:
      client?.phone ||
      (typeof row.client_phone === "string" ? row.client_phone : undefined),

    quotationId,
    quotationNumber:
      typeof row.quotation_number === "string"
        ? row.quotation_number
        : undefined,

    renewalId,
    renewalReference:
      typeof row.renewal_reference === "string"
        ? row.renewal_reference
        : undefined,

    invoiceDate: String(row.invoice_date || ""),
    dueDate: row.due_date ? String(row.due_date) : undefined,

    status: normalizeStatus(row.status),

    items,

    subtotal,
    tax,
    taxAmount,
    grandTotal,
    amount: roundMoney(
      row.amount !== null && row.amount !== undefined
        ? normalizeNumber(row.amount)
        : subtotal,
    ),

    notes: row.notes ? String(row.notes) : "",

    payments,

    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || row.created_at || ""),
  };
}

/* =========================================================
   LOAD ALL INVOICES
========================================================= */

export async function getInvoicesFromSupabase(): Promise<Invoice[]> {
  const [invoiceResult, clientMap] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    getClientMap(),
  ]);

  if (invoiceResult.error) {
    throw new Error(`Failed to load invoices: ${invoiceResult.error.message}`);
  }

  const invoiceRows = (invoiceResult.data || []) as InvoiceDbRow[];

  if (invoiceRows.length === 0) return [];

  const invoiceIds = invoiceRows.map((row) => row.id);

  const [itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("id", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (itemsResult.error) {
    throw new Error(
      `Failed to load invoice items: ${itemsResult.error.message}`,
    );
  }

  if (paymentsResult.error) {
    throw new Error(
      `Failed to load invoice payments: ${paymentsResult.error.message}`,
    );
  }

  const itemsByInvoice = new Map<number, InvoiceItemDbRow[]>();
  const paymentsByInvoice = new Map<number, PaymentDbRow[]>();

  for (const item of (itemsResult.data || []) as InvoiceItemDbRow[]) {
    const list = itemsByInvoice.get(item.invoice_id) || [];
    list.push(item);
    itemsByInvoice.set(item.invoice_id, list);
  }

  for (const payment of (paymentsResult.data || []) as PaymentDbRow[]) {
    if (payment.invoice_id === null || payment.invoice_id === undefined) {
      continue;
    }

    const invoiceId = Number(payment.invoice_id);
    const list = paymentsByInvoice.get(invoiceId) || [];
    list.push(payment);
    paymentsByInvoice.set(invoiceId, list);
  }

  const invoices = await Promise.all(
    invoiceRows.map((row) =>
      mapInvoiceRow(
        row,
        clientMap,
        itemsByInvoice.get(row.id) || [],
        paymentsByInvoice.get(row.id) || [],
      ),
    ),
  );

  return invoices.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();

    if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) {
      return dateB - dateA;
    }

    return getDatabaseId(b.id)! - getDatabaseId(a.id)!;
  });
}

export async function getInvoices(): Promise<Invoice[]> {
  return getInvoicesFromSupabase();
}

export async function getInvoiceByIdFromSupabase(
  invoiceId: string,
): Promise<Invoice | undefined> {
  const dbId = getDatabaseId(invoiceId);

  if (!dbId) return undefined;

  const [invoiceResult, clientMap] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", dbId).maybeSingle(),
    getClientMap(),
  ]);

  if (invoiceResult.error) {
    throw new Error(`Failed to load invoice: ${invoiceResult.error.message}`);
  }

  if (!invoiceResult.data) return undefined;

  const [itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", dbId)
      .order("id", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", dbId)
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (itemsResult.error) {
    throw new Error(
      `Failed to load invoice items: ${itemsResult.error.message}`,
    );
  }

  if (paymentsResult.error) {
    throw new Error(
      `Failed to load invoice payments: ${paymentsResult.error.message}`,
    );
  }

  return mapInvoiceRow(
    invoiceResult.data as InvoiceDbRow,
    clientMap,
    (itemsResult.data || []) as InvoiceItemDbRow[],
    (paymentsResult.data || []) as PaymentDbRow[],
  );
}

export async function getInvoice(
  invoiceId: string,
): Promise<Invoice | undefined> {
  return getInvoiceByIdFromSupabase(invoiceId);
}

export async function getInvoiceByRenewalId(
  renewalId: string,
): Promise<Invoice | undefined> {
  const dbRenewalId = getRelatedDatabaseId(renewalId);

  if (!dbRenewalId) return undefined;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("renewal_id", dbRenewalId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find renewal invoice: ${error.message}`);
  }

  if (!data) return undefined;

  const clientMap = await getClientMap();

  const [itemsResult, paymentsResult] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", data.id),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", data.id)
      .order("payment_date", { ascending: false }),
  ]);

  if (itemsResult.error || paymentsResult.error) {
    throw new Error(
      `Failed to load renewal invoice details: ${
        itemsResult.error?.message || paymentsResult.error?.message
      }`,
    );
  }

  return mapInvoiceRow(
    data as InvoiceDbRow,
    clientMap,
    (itemsResult.data || []) as InvoiceItemDbRow[],
    (paymentsResult.data || []) as PaymentDbRow[],
  );
}

export async function getInvoiceByQuotationId(
  quotationId: string,
): Promise<Invoice | undefined> {
  const dbQuotationId = getRelatedDatabaseId(quotationId);

  if (!dbQuotationId) return undefined;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("quotation_id", dbQuotationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find quotation invoice: ${error.message}`);
  }

  if (!data) return undefined;

  return getInvoiceByIdFromSupabase(formatDisplayId(Number(data.id)));
}

export async function getInvoiceByQuotationNumber(
  quotationNumber: string,
): Promise<Invoice | undefined> {
  const value = String(quotationNumber || "").trim();

  if (!value) return undefined;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("quotation_number", value)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    /* Older rows may not have quotation_number. */
    const fallback = await getInvoicesFromSupabase();
    return fallback.find(
      (invoice) => invoice.quotationNumber?.trim() === value,
    );
  }

  if (!data) return undefined;

  return getInvoiceByIdFromSupabase(formatDisplayId(Number(data.id)));
}

export async function getInvoiceByQuotationReference(
  quotationId?: string,
  quotationNumber?: string,
): Promise<Invoice | undefined> {
  if (quotationId) {
    const byId = await getInvoiceByQuotationId(quotationId);
    if (byId) return byId;
  }

  if (quotationNumber) {
    return getInvoiceByQuotationNumber(quotationNumber);
  }

  return undefined;
}

/* =========================================================
   GENERATE INTERNAL DISPLAY ID
========================================================= */

export async function generateInvoiceId(): Promise<string> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to generate invoice ID: ${error.message}`);
  }

  const highest = data?.[0]?.id ? Number(data[0].id) : 0;
  return formatDisplayId(highest + 1);
}

/* =========================================================
   CREATE INVOICE
========================================================= */

async function buildInvoicePayload(
  input: CreateInvoiceInput,
  invoiceNumber: string,
): Promise<Record<string, unknown>> {
  const clientDbId = await resolveClientDatabaseId(input.clientId);

  const items = input.items
    .map(calculateItem)
    .filter((item) => item.serviceName.trim() !== "");

  if (items.length === 0) {
    throw new Error("At least one invoice item is required.");
  }

  const totals = calculateInvoiceTotals(items, input.tax ?? 18);

  return {
    client_id: clientDbId,
    invoice_number: invoiceNumber,
    invoice_date: input.invoiceDate,
    due_date: input.dueDate || null,
    quotation_id: getRelatedDatabaseId(input.quotationId),
    renewal_id: getRelatedDatabaseId(input.renewalId),
    renewal_reference: input.renewalReference || null,
    service_name: items[0]?.serviceName || null,
    amount: totals.subtotal,
    tax: totals.tax,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    grand_total: totals.grandTotal,
    discount: roundMoney(
      items.reduce((sum, item) => sum + normalizeNumber(item.discount), 0),
    ),
    balance_amount: totals.grandTotal,
    items,
    notes: input.notes || null,
    status: input.status || "Draft",
  };
}

async function insertInvoiceItems(
  invoiceDbId: number,
  items: Partial<InvoiceItem>[],
): Promise<void> {
  const prepared = items
    .map(calculateItem)
    .filter((item) => item.serviceName.trim() !== "");

  if (prepared.length === 0) {
    throw new Error("At least one invoice item is required.");
  }

  // The DEV database uses the normalized invoice_items schema:
  // invoice_id, service_id, description, quantity, unit_price, amount.
  const rows = prepared.map((item) => ({
    invoice_id: invoiceDbId,
    service_id: getRelatedDatabaseId(item.serviceId),
    description: item.description || item.serviceName,
    quantity: 1,
    unit_price: item.basicCost,
    amount: item.finalCost,
  }));

  const { error } = await supabase.from("invoice_items").insert(rows);

  if (error) {
    throw new Error(`Failed to save invoice items: ${error.message}`);
  }
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<Invoice> {
  if (!input.clientId) {
    throw new Error("Client is required.");
  }

  if (!input.invoiceDate || !isValidDate(input.invoiceDate)) {
    throw new Error("Invoice date is required and must be valid.");
  }

  if (
    input.dueDate &&
    isValidDate(input.dueDate) &&
    input.dueDate < input.invoiceDate
  ) {
    throw new Error("Due date cannot be before invoice date.");
  }

  const existingQuotationInvoice = await getInvoiceByQuotationReference(
    input.quotationId,
    input.quotationNumber,
  );

  if (existingQuotationInvoice) {
    throw new Error(
      `An invoice already exists for quotation "${
        existingQuotationInvoice.quotationNumber ||
        input.quotationNumber ||
        input.quotationId
      }".`,
    );
  }

  const prefix = getInvoicePrefix(input);
  let invoiceNumber = await generateInvoiceNumber(
    input.clientId,
    prefix,
    input.invoiceDate,
  );

  let insertedRow: InvoiceDbRow | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const payload = await buildInvoicePayload(input, invoiceNumber);

    const result = await supabase
      .from("invoices")
      .insert(payload)
      .select("*")
      .single();

    if (!result.error) {
      insertedRow = result.data as InvoiceDbRow;
      break;
    }

    if (attempt === 0 && result.error.code === "23505") {
      invoiceNumber = await generateInvoiceNumber(
        input.clientId,
        prefix,
        input.invoiceDate,
      );
      continue;
    }

    throw new Error(`Failed to create invoice: ${result.error.message}`);
  }

  if (!insertedRow) {
    throw new Error("Invoice could not be created.");
  }

  try {
    await insertInvoiceItems(insertedRow.id, input.items);
  } catch (error) {
    /*
     * Do not physically delete the invoice if item insertion fails.
     * Mark it Cancelled so financial history is retained.
     */
    await supabase
      .from("invoices")
      .update({
        status: "Cancelled",
        notes: `${String(input.notes || "")}\nInvoice creation incomplete: ${
          error instanceof Error ? error.message : "item save failed"
        }`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", insertedRow.id);

    throw error;
  }

  const invoice = await getInvoiceByIdFromSupabase(
    formatDisplayId(insertedRow.id),
  );

  if (!invoice) {
    throw new Error("Invoice was created but could not be reloaded.");
  }

  void createActivityLog({
    action: "INVOICE_CREATED",
    module: "Invoices",
    record_id: invoice.id,
    record_name: invoiceRecordName(invoice),
    description: `Created invoice "${invoice.invoiceNumber}" for "${invoice.clientName}"`,
    new_data: invoice as unknown as Record<string, unknown>,
  });

  return invoice;
}

export async function addInvoice(invoice: Invoice): Promise<Invoice> {
  return createInvoice({
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    clientContactPerson: invoice.clientContactPerson,
    clientAddress: invoice.clientAddress,
    clientGstNumber: invoice.clientGstNumber,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,
    quotationId: invoice.quotationId,
    quotationNumber: invoice.quotationNumber,
    renewalId: invoice.renewalId,
    renewalReference: invoice.renewalReference,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    items: invoice.items,
    tax: invoice.tax,
    notes: invoice.notes,
  });
}

/* =========================================================
   UPDATE INVOICE
========================================================= */

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Invoice>,
): Promise<Invoice | undefined> {
  const existing = await getInvoiceByIdFromSupabase(invoiceId);

  if (!existing) return undefined;

  if (existing.status === "Cancelled" && updates.status !== "Cancelled") {
    return existing;
  }

  const dbId = getDatabaseId(invoiceId);

  if (!dbId) return undefined;

  const updatePayload: Record<string, unknown> = {};

  if (updates.clientId !== undefined) {
    updatePayload.client_id = await resolveClientDatabaseId(updates.clientId);
  }

  if (updates.invoiceDate !== undefined) {
    updatePayload.invoice_date = updates.invoiceDate;
  }

  if (updates.dueDate !== undefined) {
    updatePayload.due_date = updates.dueDate || null;
  }

  if (updates.quotationId !== undefined) {
    updatePayload.quotation_id = getRelatedDatabaseId(updates.quotationId);
  }

  if (updates.renewalId !== undefined) {
    updatePayload.renewal_id = getRelatedDatabaseId(updates.renewalId);
  }

  if (updates.status !== undefined) {
    updatePayload.status = updates.status;
  }

  if (updates.notes !== undefined) {
    updatePayload.notes = updates.notes || null;
  }

  let preparedItems: InvoiceItem[] | undefined;

  if (updates.items !== undefined) {
    preparedItems = updates.items
      .map(calculateItem)
      .filter((item) => item.serviceName.trim() !== "");

    if (preparedItems.length === 0) {
      throw new Error("At least one invoice item is required.");
    }

    const totals = calculateInvoiceTotals(
      preparedItems,
      updates.tax ?? existing.tax,
    );

    updatePayload.service_name = preparedItems[0]?.serviceName || null;
    updatePayload.amount = totals.subtotal;
    updatePayload.tax = totals.tax;
    updatePayload.subtotal = totals.subtotal;
    updatePayload.tax_amount = totals.taxAmount;
    updatePayload.grand_total = totals.grandTotal;
    updatePayload.discount = roundMoney(
      preparedItems.reduce(
        (sum, item) => sum + normalizeNumber(item.discount),
        0,
      ),
    );
    updatePayload.balance_amount = totals.grandTotal;
    updatePayload.items = preparedItems;
  } else if (updates.tax !== undefined) {
    const totals = calculateInvoiceTotals(existing.items, updates.tax);

    updatePayload.tax = totals.tax;
    updatePayload.subtotal = totals.subtotal;
    updatePayload.tax_amount = totals.taxAmount;
    updatePayload.grand_total = totals.grandTotal;
    updatePayload.amount = totals.subtotal;
    updatePayload.balance_amount = totals.grandTotal;
  }

  if (Object.keys(updatePayload).length > 0) {
    updatePayload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", dbId);

    if (error) {
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  if (preparedItems) {
    /*
     * Invoice item IDs are child records. Replacing child rows is
     * safe because the invoice itself and its financial history
     * remain. This does not delete the invoice or payments.
     */
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", dbId);

    if (deleteError) {
      throw new Error(
        `Failed to replace invoice items: ${deleteError.message}`,
      );
    }

    await insertInvoiceItems(dbId, preparedItems);
  }

  const updated = await getInvoiceByIdFromSupabase(invoiceId);

  if (!updated) return undefined;

  const oldData = existing as unknown as Record<string, unknown>;
  const newData = updated as unknown as Record<string, unknown>;

  if (existing.status !== updated.status) {
    void createActivityLog({
      action: "STATUS_CHANGED",
      module: "Invoices",
      record_id: updated.id,
      record_name: invoiceRecordName(updated),
      description: `Changed invoice "${updated.invoiceNumber}" status from "${existing.status}" to "${updated.status}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  if (Object.keys(updates).some((key) => key !== "status")) {
    void createActivityLog({
      action: "UPDATE",
      module: "Invoices",
      record_id: updated.id,
      record_name: invoiceRecordName(updated),
      description: `Updated invoice "${updated.invoiceNumber}"`,
      old_data: oldData,
      new_data: newData,
    });
  }

  return updated;
}

/* =========================================================
   CANCEL / ARCHIVE INVOICE
========================================================= */

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const existing = await getInvoiceByIdFromSupabase(invoiceId);

  if (!existing) return false;

  if (existing.status === "Cancelled") return true;

  const dbId = getDatabaseId(invoiceId);

  if (!dbId) return false;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "Cancelled",
      updated_at: now,
    })
    .eq("id", dbId);

  if (error) {
    throw new Error(`Failed to cancel invoice: ${error.message}`);
  }

  const updated = await getInvoiceByIdFromSupabase(invoiceId);

  if (updated) {
    void createActivityLog({
      action: "ARCHIVE",
      module: "Invoices",
      record_id: updated.id,
      record_name: invoiceRecordName(updated),
      description: `Cancelled invoice "${updated.invoiceNumber}"`,
      old_data: existing as unknown as Record<string, unknown>,
      new_data: updated as unknown as Record<string, unknown>,
    });
  }

  return true;
}

/* =========================================================
   DUPLICATE INVOICE
========================================================= */

export async function duplicateInvoice(
  invoiceId: string,
): Promise<Invoice | undefined> {
  const invoice = await getInvoiceByIdFromSupabase(invoiceId);

  if (!invoice) return undefined;

  return createInvoice({
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    clientContactPerson: invoice.clientContactPerson,
    clientAddress: invoice.clientAddress,
    clientGstNumber: invoice.clientGstNumber,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,

    quotationId: undefined,
    quotationNumber: undefined,
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
   PAYMENTS
========================================================= */

function getActivePaymentTotal(invoice: Invoice): number {
  return roundMoney(
    invoice.payments
      .filter((payment) => payment.status !== "Cancelled")
      .reduce((sum, payment) => sum + normalizeNumber(payment.amountPaid), 0),
  );
}

export async function addInvoicePayment(
  invoiceId: string,
  input: AddPaymentInput,
): Promise<Invoice | undefined> {
  const invoice = await getInvoiceByIdFromSupabase(invoiceId);

  if (!invoice) return undefined;

  if (invoice.status === "Cancelled") {
    throw new Error("Payment cannot be added to a cancelled invoice.");
  }

  const paymentAmount = roundMoney(input.amountPaid);

  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (!isValidDate(input.paymentDate)) {
    throw new Error("Payment date is required and must be valid.");
  }

  if (!input.paymentMode?.trim()) {
    throw new Error("Payment mode is required.");
  }

  const totalPaid = getActivePaymentTotal(invoice);
  const grandTotal = roundMoney(invoice.grandTotal);
  const balance = roundMoney(grandTotal - totalPaid);

  if (grandTotal <= 0) {
    throw new Error("Invoice total must be greater than zero.");
  }

  if (balance <= 0) {
    throw new Error("This invoice is already fully paid.");
  }

  if (paymentAmount > balance) {
    throw new Error("Payment cannot be greater than outstanding balance.");
  }

  const dbInvoiceId = getDatabaseId(invoiceId);
  const dbClientId = await resolveClientDatabaseId(invoice.clientId);

  if (!dbInvoiceId) return undefined;

  const payload = {
    invoice_id: dbInvoiceId,
    client_id: dbClientId,
    payment_date: input.paymentDate,
    amount: paymentAmount,
    payment_method: input.paymentMode.trim(),
    transaction_reference: input.transactionNumber?.trim() || null,
    payment_proof: input.paymentProof || null,
    notes: input.notes?.trim() || null,
    status: "Received",
  };

  const { data, error } = await supabase
    .from("payments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to add payment: ${error.message}`);
  }

  const newTotalPaid = roundMoney(totalPaid + paymentAmount);

  let newStatus: InvoiceStatus;

  if (newTotalPaid >= grandTotal) {
    newStatus = "Paid";
  } else if (newTotalPaid > 0) {
    newStatus = "Partially Paid";
  } else {
    newStatus =
      invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`) < new Date()
        ? "Overdue"
        : "Sent";
  }

  await supabase
    .from("invoices")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dbInvoiceId);

  const updated = await getInvoiceByIdFromSupabase(invoiceId);

  if (updated) {
    void createActivityLog({
      action: "PAYMENT_ADDED",
      module: "Payments",
      record_id: updated.invoiceNumber,
      record_name: updated.clientName,
      description: `Added payment of ₹${paymentAmount.toLocaleString(
        "en-IN",
      )} to invoice ${updated.invoiceNumber}`,
      new_data: {
        paymentId: `PAY-${data.id}`,
        invoiceId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        clientName: updated.clientName,
        amountPaid: paymentAmount,
        paymentMode: input.paymentMode,
        paymentDate: input.paymentDate,
        transactionNumber: input.transactionNumber || "",
        totalPaid: newTotalPaid,
        outstandingBalance: Math.max(0, roundMoney(grandTotal - newTotalPaid)),
        invoiceStatus: newStatus,
      },
    });
  }

  return updated;
}

export async function cancelInvoicePayment(
  invoiceId: string,
  paymentId: string,
  cancellationReason = "Payment cancelled",
): Promise<Invoice | undefined> {
  const invoice = await getInvoiceByIdFromSupabase(invoiceId);

  if (!invoice) return undefined;

  const payment = invoice.payments.find((item) => item.id === paymentId);

  if (!payment) return undefined;

  if (payment.status === "Cancelled") return invoice;

  const dbPaymentId = getRelatedDatabaseId(paymentId);

  if (!dbPaymentId) {
    throw new Error("Payment ID is invalid.");
  }

  const reason = cancellationReason.trim() || "Payment cancelled";
  const cancelledAt = new Date().toISOString();

  const encodedNotes = encodeCancelledPaymentNotes(
    payment.notes,
    cancelledAt,
    reason,
  );

  const { error } = await supabase
    .from("payments")
    .update({
      status: "Cancelled",
      notes: encodedNotes,
      updated_at: cancelledAt,
    })
    .eq("id", dbPaymentId);

  if (error) {
    throw new Error(`Failed to cancel payment: ${error.message}`);
  }

  const activePayments = invoice.payments.filter(
    (item) => item.id !== paymentId && item.status !== "Cancelled",
  );

  const totalPaid = roundMoney(
    activePayments.reduce(
      (sum, item) => sum + normalizeNumber(item.amountPaid),
      0,
    ),
  );

  let newStatus: InvoiceStatus;

  if (totalPaid <= 0) {
    newStatus =
      invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`) < new Date()
        ? "Overdue"
        : "Sent";
  } else if (totalPaid >= invoice.grandTotal) {
    newStatus = "Paid";
  } else {
    newStatus = "Partially Paid";
  }

  const dbInvoiceId = getDatabaseId(invoiceId);

  if (dbInvoiceId) {
    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({
        status: newStatus,
        updated_at: cancelledAt,
      })
      .eq("id", dbInvoiceId);

    if (invoiceError) {
      throw new Error(
        `Payment cancelled but invoice status could not be updated: ${invoiceError.message}`,
      );
    }
  }

  const updated = await getInvoiceByIdFromSupabase(invoiceId);

  if (updated) {
    void createActivityLog({
      action: "PAYMENT_CANCELLED",
      module: "Payments",
      record_id: updated.invoiceNumber,
      record_name: updated.clientName,
      description: `Cancelled payment of ₹${payment.amountPaid.toLocaleString(
        "en-IN",
      )} for invoice ${updated.invoiceNumber}`,
      old_data: {
        paymentId,
        invoiceId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        clientName: updated.clientName,
        amountPaid: payment.amountPaid,
        paymentMode: payment.paymentMode,
        paymentDate: payment.paymentDate,
        status: "Active",
      },
      new_data: {
        paymentId,
        status: "Cancelled",
        cancellationReason: reason,
        cancelledAt,
        totalPaid,
        outstandingBalance: Math.max(
          0,
          roundMoney(updated.grandTotal - totalPaid),
        ),
        invoiceStatus: newStatus,
      },
    });
  }

  return updated;
}

export async function removeInvoicePayment(
  invoiceId: string,
  paymentId: string,
): Promise<Invoice | undefined> {
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
  const totalPaid = getActivePaymentTotal(invoice);
  const balance = Math.max(0, roundMoney(invoice.grandTotal - totalPaid));

  return {
    totalPaid,
    balance,
    isPaid: balance <= 0,
  };
}

/* =========================================================
   SEARCH / SORT / SUMMARY
========================================================= */

export async function searchInvoices(
  searchTerm: string,
  status: InvoiceStatus | "All" = "All",
): Promise<Invoice[]> {
  const invoices = await getInvoicesFromSupabase();
  const search = searchTerm.trim().toLowerCase();

  return invoices
    .filter((invoice) => {
      const matchesSearch =
        !search ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.clientName.toLowerCase().includes(search) ||
        invoice.id.toLowerCase().includes(search) ||
        (invoice.quotationNumber || "").toLowerCase().includes(search) ||
        invoice.items.some((item) =>
          item.serviceName.toLowerCase().includes(search),
        );

      const matchesStatus = status === "All" || invoice.status === status;

      return matchesSearch && matchesStatus;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getInvoicesSorted(): Promise<Invoice[]> {
  return getInvoicesFromSupabase();
}

export interface InvoiceSummary {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  totalValue: number;
  totalPaid: number;
  outstanding: number;
}

export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  const invoices = await getInvoicesFromSupabase();

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
    activeInvoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0),
  );

  const totalPaid = roundMoney(
    activeInvoices.reduce(
      (sum, invoice) => sum + getActivePaymentTotal(invoice),
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
   OVERDUE
========================================================= */

export async function updateOverdueInvoices(): Promise<void> {
  const invoices = await getInvoicesFromSupabase();
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  for (const invoice of invoices) {
    if (
      invoice.status === "Paid" ||
      invoice.status === "Cancelled" ||
      !invoice.dueDate
    ) {
      continue;
    }

    const dueDate = new Date(`${invoice.dueDate}T00:00:00`);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate >= today) continue;

    const paymentSummary = getInvoicePaymentSummary(invoice);

    if (!paymentSummary.isPaid && invoice.status !== "Overdue") {
      const dbId = getDatabaseId(invoice.id);

      if (dbId) {
        await supabase
          .from("invoices")
          .update({
            status: "Overdue",
            updated_at: new Date().toISOString(),
          })
          .eq("id", dbId);
      }
    }
  }
}

/* =========================================================
   COMPATIBILITY
========================================================= */

/*
 * The new canonical APIs above are asynchronous because Supabase
 * is the source of truth.
 *
 * These helpers intentionally return Promises as well. Existing
 * pages should migrate to:
 *
 *   await getInvoicesSorted()
 *   await getInvoice()
 *   await createInvoice()
 *   await updateInvoice()
 *
 * Do not reintroduce localStorage invoice business data.
 */

export async function clearAllInvoices(): Promise<void> {
  const invoices = await getInvoicesFromSupabase();

  const active = invoices.filter((invoice) => invoice.status !== "Cancelled");

  for (const invoice of active) {
    await deleteInvoice(invoice.id);
  }
}
