import { useMemo, useState, type ReactNode } from "react";

import {
  getInvoices,
  getInvoicePaymentSummary,
  type Invoice,
  type InvoicePayment,
} from "../data/invoiceStore";

import { getFollowUps, type FollowUp } from "../data/followUpStore";

import { getLeads, type Lead } from "../data/leadStore";

import { getQuotations, type Quotation } from "../data/quotationStore";

import { getRenewals, type Renewal } from "../data/renewalStore";

import {
  getActiveSalesPersons,
  type SalesPerson,
} from "../data/salesPersonStore";

/* =========================================================
   TYPES
========================================================= */

type ReportType =
  | "sales"
  | "lead"
  | "quotation"
  | "invoice"
  | "received"
  | "outstanding"
  | "cancelled"
  | "renewal"
  | "client"
  | "datewise"
  | "mode"
  | "followup"
  | "salesperson";

type Period =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "lastYear"
  | "custom";

type DateRange = {
  from: string;
  to: string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value?: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateInput(date);
}

function isDateInRange(value: string | undefined, range: DateRange): boolean {
  const date = normalizeDate(value);

  if (!date) return false;

  return date >= range.from && date <= range.to;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadCSV(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function getRange(period: Period): DateRange {
  const today = new Date();

  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      break;

    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;

    case "last7":
      start.setDate(start.getDate() - 6);
      break;

    case "last30":
      start.setDate(start.getDate() - 29);
      break;

    case "lastYear":
      start.setFullYear(start.getFullYear() - 1);
      break;

    case "custom":
      break;
  }

  return {
    from: toDateInput(start),
    to: toDateInput(end),
  };
}

function getDefaultCustomRange(): DateRange {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - 29);

  return {
    from: toDateInput(start),
    to: toDateInput(end),
  };
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function ReportCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  const normalizedTitle = title.toLowerCase();

  let accent = "border-l-green-600";

  if (normalizedTitle.includes("received")) {
    accent = "border-l-green-600";
  } else if (
    normalizedTitle.includes("outstanding") ||
    normalizedTitle.includes("renewal overdue")
  ) {
    accent = "border-l-orange-500";
  } else if (normalizedTitle.includes("overdue")) {
    accent = "border-l-red-500";
  } else if (normalizedTitle.includes("conversion")) {
    accent = "border-l-blue-500";
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 ${accent} bg-white p-4 shadow-sm transition hover:shadow-md`}
    >
      <div className="text-sm font-medium text-gray-500">{title}</div>

      <div className="mt-2 text-2xl font-bold tracking-tight text-[#0B2742]">
        {value}
      </div>

      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let classes = "border-gray-200 bg-gray-50 text-gray-600";

  if (
    normalized.includes("paid") ||
    normalized.includes("won") ||
    normalized.includes("completed") ||
    normalized.includes("accepted") ||
    normalized.includes("active")
  ) {
    classes = "border-green-200 bg-green-50 text-green-700";
  } else if (
    normalized.includes("overdue") ||
    normalized.includes("lost") ||
    normalized.includes("cancel")
  ) {
    classes = "border-red-200 bg-red-50 text-red-700";
  } else if (
    normalized.includes("pending") ||
    normalized.includes("follow") ||
    normalized.includes("due soon")
  ) {
    classes = "border-orange-200 bg-orange-50 text-orange-700";
  } else if (
    normalized.includes("sent") ||
    normalized.includes("negotiation") ||
    normalized.includes("due") ||
    normalized.includes("contacted")
  ) {
    classes = "border-blue-200 bg-blue-50 text-blue-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F4F7FA]">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#506B85]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-14 text-center">
                  <div className="text-3xl">📊</div>

                  <p className="mt-3 text-sm font-medium text-[#0B2742]">
                    No records found
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    No data is available for the selected period.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 last:border-0 hover:bg-[#F8FAFC]"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="whitespace-nowrap px-4 py-3 text-gray-700"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("sales");

  const [period, setPeriod] = useState<Period>("last30");

  const [customRange, setCustomRange] = useState<DateRange>(
    getDefaultCustomRange(),
  );

  const [refreshKey, setRefreshKey] = useState(0);

  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  const invoices = useMemo<Invoice[]>(() => getInvoices(), [refreshKey]);

  const payments = useMemo<InvoicePayment[]>(
    () =>
      invoices.flatMap((invoice) =>
        (invoice.payments || []).filter(
          (payment) => payment.status !== "Cancelled",
        ),
      ),
    [invoices],
  );

  const cancelledPayments = useMemo<InvoicePayment[]>(
    () =>
      invoices.flatMap((invoice) =>
        (invoice.payments || []).filter(
          (payment) => payment.status === "Cancelled",
        ),
      ),
    [invoices],
  );

  const followUps = useMemo<FollowUp[]>(() => getFollowUps(), [refreshKey]);

  const leads = useMemo<Lead[]>(() => getLeads(), [refreshKey]);

  const quotations = useMemo<Quotation[]>(() => getQuotations(), [refreshKey]);

  const renewals = useMemo<Renewal[]>(() => getRenewals(), [refreshKey]);

  const salesPersons = useMemo<SalesPerson[]>(
    () => getActiveSalesPersons(),
    [refreshKey],
  );

  /* -------------------------------------------------------
     DATE RANGE
  ------------------------------------------------------- */

  const dateRange = useMemo<DateRange>(() => {
    if (period === "custom") {
      return customRange;
    }

    return getRange(period);
  }, [period, customRange]);

  /* -------------------------------------------------------
     FILTERED DATA
  ------------------------------------------------------- */

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        isDateInRange(invoice.invoiceDate, dateRange),
      ),
    [invoices, dateRange],
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) =>
        isDateInRange(payment.paymentDate, dateRange),
      ),
    [payments, dateRange],
  );

  const filteredCancelledPayments = useMemo(
    () =>
      cancelledPayments.filter((payment) =>
        isDateInRange(payment.paymentDate, dateRange),
      ),
    [cancelledPayments, dateRange],
  );

  const filteredFollowUps = useMemo(
    () =>
      followUps.filter((followUp) =>
        isDateInRange(followUp.followUpDate, dateRange),
      ),
    [followUps, dateRange],
  );

  const filteredLeads = useMemo(
    () => leads.filter((lead) => isDateInRange(lead.createdAt, dateRange)),
    [leads, dateRange],
  );

  const filteredQuotations = useMemo(
    () =>
      quotations.filter((quotation) =>
        isDateInRange(quotation.quotationDate, dateRange),
      ),
    [quotations, dateRange],
  );

  const filteredRenewals = useMemo(
    () =>
      renewals.filter((renewal) =>
        isDateInRange(renewal.renewalDate, dateRange),
      ),
    [renewals, dateRange],
  );

  /* =========================================================
     MANAGEMENT METRICS
  ========================================================= */

  const leadMetrics = useMemo(() => {
    const won = filteredLeads.filter((lead) => lead.status === "Won").length;

    const lost = filteredLeads.filter((lead) => lead.status === "Lost").length;

    const decided = won + lost;

    const conversion = decided > 0 ? (won / decided) * 100 : 0;

    const pipelineValue = filteredLeads
      .filter((lead) => lead.status !== "Won" && lead.status !== "Lost")
      .reduce((sum, lead) => sum + (Number(lead.expectedValue) || 0), 0);

    return {
      total: filteredLeads.length,
      won,
      lost,
      conversion,
      pipelineValue,
    };
  }, [filteredLeads]);

  const commercialMetrics = useMemo(() => {
    const invoiceValue = filteredInvoices.reduce(
      (sum, invoice) => sum + (Number(invoice.grandTotal) || 0),
      0,
    );

    const totalReceived = filteredPayments.reduce(
      (sum, payment) => sum + (Number(payment.amountPaid) || 0),
      0,
    );

    const outstanding = filteredInvoices.reduce((sum, invoice) => {
      const summary = getInvoicePaymentSummary(invoice);

      return sum + summary.balance;
    }, 0);

    const overdue = filteredInvoices
      .filter((invoice) => invoice.status === "Overdue")
      .reduce((sum, invoice) => {
        const summary = getInvoicePaymentSummary(invoice);

        return sum + summary.balance;
      }, 0);

    const quotationValue = filteredQuotations.reduce(
      (sum, quotation) => sum + (Number(quotation.grandTotal) || 0),
      0,
    );

    return {
      quotationValue,
      invoiceValue,
      totalReceived,
      outstanding,
      overdue,
    };
  }, [filteredInvoices, filteredPayments, filteredQuotations]);

  const renewalMetrics = useMemo(() => {
    const upcoming = filteredRenewals.filter(
      (renewal) => renewal.status === "Upcoming",
    );

    const dueSoon = filteredRenewals.filter(
      (renewal) => renewal.status === "Due Soon",
    );

    const overdue = filteredRenewals.filter(
      (renewal) => renewal.status === "Overdue",
    );

    const completed = filteredRenewals.filter(
      (renewal) => renewal.status === "Completed",
    );

    return {
      total: filteredRenewals.length,
      upcoming: upcoming.length,
      dueSoon: dueSoon.length,
      overdue: overdue.length,
      completed: completed.length,
      upcomingValue: upcoming.reduce(
        (sum, renewal) => sum + (Number(renewal.amount) || 0),
        0,
      ),
      dueSoonValue: dueSoon.reduce(
        (sum, renewal) => sum + (Number(renewal.amount) || 0),
        0,
      ),
      overdueValue: overdue.reduce(
        (sum, renewal) => sum + (Number(renewal.amount) || 0),
        0,
      ),
    };
  }, [filteredRenewals]);

  /* =========================================================
     PERIOD HANDLER
  ========================================================= */

  function applyPeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);

    if (nextPeriod === "custom") {
      setCustomRange(getDefaultCustomRange());
    }
  }

  /* =========================================================
     REPORT TABS
  ========================================================= */

  const reportTabs: {
    id: ReportType;
    label: string;
  }[] = [
    { id: "sales", label: "Sales" },
    { id: "lead", label: "Leads" },
    { id: "quotation", label: "Quotations" },
    { id: "invoice", label: "Invoices" },
    { id: "received", label: "Received" },
    { id: "outstanding", label: "Outstanding" },
    { id: "cancelled", label: "Cancelled" },
    { id: "renewal", label: "Renewals" },
    { id: "client", label: "Clients" },
    { id: "datewise", label: "Date-wise" },
    { id: "mode", label: "Payment Mode" },
    { id: "followup", label: "Follow-ups" },
    { id: "salesperson", label: "Sales Persons" },
  ];

  /* =========================================================
     REPORT RENDERERS
  ========================================================= */

  function renderSalesReport() {
    const salesByDate = new Map<
      string,
      {
        invoices: number;
        invoiceValue: number;
        received: number;
      }
    >();

    filteredInvoices.forEach((invoice) => {
      const date = normalizeDate(invoice.invoiceDate);

      if (!date) return;

      const current = salesByDate.get(date) || {
        invoices: 0,
        invoiceValue: 0,
        received: 0,
      };

      current.invoices += 1;
      current.invoiceValue += Number(invoice.grandTotal) || 0;

      salesByDate.set(date, current);
    });

    filteredPayments.forEach((payment) => {
      const date = normalizeDate(payment.paymentDate);

      if (!date) return;

      const current = salesByDate.get(date) || {
        invoices: 0,
        invoiceValue: 0,
        received: 0,
      };

      current.received += Number(payment.amountPaid) || 0;

      salesByDate.set(date, current);
    });

    const rows = [...salesByDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => [
        formatDate(date),
        data.invoices,
        formatMoney(data.invoiceValue),
        <span className="font-medium text-green-700">
          {formatMoney(data.received)}
        </span>,
        <span className="font-medium text-orange-600">
          {formatMoney(data.invoiceValue - data.received)}
        </span>,
      ]);

    return (
      <ReportTable
        headers={[
          "Date",
          "Invoices",
          "Invoice Value",
          "Received",
          "Net Outstanding",
        ]}
        rows={rows}
      />
    );
  }

  function renderLeadReport() {
    const rows = [...filteredLeads]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .map((lead) => [
        lead.id,
        lead.companyName,
        lead.contactPerson,
        lead.leadSource,
        lead.assignedTo || "-",
        formatMoney(lead.expectedValue || 0),
        <StatusBadge key={`${lead.id}-status`} status={lead.status} />,
        formatDate(lead.createdAt),
      ]);

    return (
      <ReportTable
        headers={[
          "Lead ID",
          "Company",
          "Contact",
          "Source",
          "Sales Person",
          "Expected Value",
          "Status",
          "Created",
        ]}
        rows={rows}
      />
    );
  }

  function renderQuotationReport() {
    const rows = [...filteredQuotations]
      .sort((a, b) =>
        (b.quotationDate || "").localeCompare(a.quotationDate || ""),
      )
      .map((quotation) => [
        quotation.quotationNumber,
        quotation.clientName,
        quotation.salesPersonName || "-",
        formatDate(quotation.quotationDate),
        formatMoney(quotation.grandTotal),
        <StatusBadge
          key={`${quotation.id}-status`}
          status={quotation.status}
        />,
      ]);

    return (
      <ReportTable
        headers={[
          "Quotation No.",
          "Client",
          "Sales Person",
          "Date",
          "Value",
          "Status",
        ]}
        rows={rows}
      />
    );
  }

  function renderInvoiceReport() {
    const rows = [...filteredInvoices]
      .sort((a, b) => (b.invoiceDate || "").localeCompare(a.invoiceDate || ""))
      .map((invoice) => {
        const summary = getInvoicePaymentSummary(invoice);

        return [
          invoice.invoiceNumber,
          invoice.clientName,
          formatDate(invoice.invoiceDate),
          formatMoney(invoice.grandTotal),
          <span className="font-medium text-green-700">
            {formatMoney(summary.totalPaid)}
          </span>,
          <span className="font-medium text-orange-600">
            {formatMoney(summary.balance)}
          </span>,
          <StatusBadge key={`${invoice.id}-status`} status={invoice.status} />,
        ];
      });

    return (
      <ReportTable
        headers={[
          "Invoice No.",
          "Client",
          "Date",
          "Invoice Value",
          "Received",
          "Balance",
          "Status",
        ]}
        rows={rows}
      />
    );
  }

  function renderReceivedReport() {
    const rows = [...filteredPayments]
      .sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""))
      .map((payment) => {
        const invoice = invoices.find((item) => item.id === payment.invoiceId);

        return [
          payment.id,
          invoice?.invoiceNumber || "-",
          invoice?.clientName || "-",
          formatDate(payment.paymentDate),
          payment.paymentMode,
          payment.transactionNumber || "-",
          <span className="font-semibold text-green-700">
            {formatMoney(payment.amountPaid)}
          </span>,
        ];
      });

    return (
      <ReportTable
        headers={[
          "Payment ID",
          "Invoice",
          "Client",
          "Date",
          "Mode",
          "Reference",
          "Amount",
        ]}
        rows={rows}
      />
    );
  }

  function renderOutstandingReport() {
    const rows = filteredInvoices
      .map((invoice) => {
        const summary = getInvoicePaymentSummary(invoice);

        return {
          invoice,
          balance: summary.balance,
        };
      })
      .filter((item) => item.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .map(({ invoice, balance }) => [
        invoice.invoiceNumber,
        invoice.clientName,
        formatDate(invoice.invoiceDate),
        formatDate(invoice.dueDate),
        formatMoney(invoice.grandTotal),
        <span className="font-semibold text-orange-600">
          {formatMoney(balance)}
        </span>,
        <StatusBadge key={`${invoice.id}-status`} status={invoice.status} />,
      ]);

    return (
      <ReportTable
        headers={[
          "Invoice",
          "Client",
          "Invoice Date",
          "Due Date",
          "Invoice Value",
          "Outstanding",
          "Status",
        ]}
        rows={rows}
      />
    );
  }

  function renderCancelledReport() {
    const rows = [...filteredCancelledPayments]
      .sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""))
      .map((payment) => {
        const invoice = invoices.find((item) => item.id === payment.invoiceId);

        return [
          payment.id,
          invoice?.invoiceNumber || "-",
          invoice?.clientName || "-",
          formatDate(payment.paymentDate),
          payment.paymentMode,
          <span className="font-medium text-red-600">
            {formatMoney(payment.amountPaid)}
          </span>,
          payment.cancellationReason || "-",
        ];
      });

    return (
      <ReportTable
        headers={[
          "Payment ID",
          "Invoice",
          "Client",
          "Date",
          "Mode",
          "Amount",
          "Cancellation Reason",
        ]}
        rows={rows}
      />
    );
  }

  function renderRenewalReport() {
    const rows = [...filteredRenewals]
      .sort((a, b) => (a.renewalDate || "").localeCompare(b.renewalDate || ""))
      .map((renewal) => [
        renewal.id,
        renewal.clientName,
        renewal.service,
        formatDate(renewal.renewalDate),
        formatMoney(renewal.amount),
        <StatusBadge key={`${renewal.id}-status`} status={renewal.status} />,
        renewal.notes || "-",
      ]);

    return (
      <ReportTable
        headers={[
          "Renewal ID",
          "Client",
          "Service",
          "Renewal Date",
          "Amount",
          "Status",
          "Notes",
        ]}
        rows={rows}
      />
    );
  }

  function renderClientReport() {
    const clientMap = new Map<
      string,
      {
        invoices: number;
        invoiceValue: number;
        received: number;
        outstanding: number;
      }
    >();

    filteredInvoices.forEach((invoice) => {
      const key = invoice.clientId || invoice.clientName;

      const current = clientMap.get(key) || {
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        outstanding: 0,
      };

      const summary = getInvoicePaymentSummary(invoice);

      current.invoices += 1;
      current.invoiceValue += Number(invoice.grandTotal) || 0;
      current.received += summary.totalPaid;
      current.outstanding += summary.balance;

      clientMap.set(key, current);
    });

    const rows = [...clientMap.entries()]
      .sort((a, b) => b[1].invoiceValue - a[1].invoiceValue)
      .map(([clientId, data]) => {
        const invoice = filteredInvoices.find(
          (item) => (item.clientId || item.clientName) === clientId,
        );

        return [
          invoice?.clientName || clientId,
          data.invoices,
          formatMoney(data.invoiceValue),
          <span className="font-medium text-green-700">
            {formatMoney(data.received)}
          </span>,
          <span className="font-medium text-orange-600">
            {formatMoney(data.outstanding)}
          </span>,
        ];
      });

    return (
      <ReportTable
        headers={[
          "Client",
          "Invoices",
          "Invoice Value",
          "Received",
          "Outstanding",
        ]}
        rows={rows}
      />
    );
  }

  function renderDatewiseReport() {
    const dateMap = new Map<
      string,
      {
        leads: number;
        quotations: number;
        invoices: number;
        invoiceValue: number;
        received: number;
        followUps: number;
      }
    >();

    filteredLeads.forEach((lead) => {
      const date = normalizeDate(lead.createdAt);

      if (!date) return;

      const current = dateMap.get(date) || {
        leads: 0,
        quotations: 0,
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        followUps: 0,
      };

      current.leads += 1;
      dateMap.set(date, current);
    });

    filteredQuotations.forEach((quotation) => {
      const date = normalizeDate(quotation.quotationDate);

      if (!date) return;

      const current = dateMap.get(date) || {
        leads: 0,
        quotations: 0,
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        followUps: 0,
      };

      current.quotations += 1;
      dateMap.set(date, current);
    });

    filteredInvoices.forEach((invoice) => {
      const date = normalizeDate(invoice.invoiceDate);

      if (!date) return;

      const current = dateMap.get(date) || {
        leads: 0,
        quotations: 0,
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        followUps: 0,
      };

      current.invoices += 1;
      current.invoiceValue += Number(invoice.grandTotal) || 0;

      dateMap.set(date, current);
    });

    filteredPayments.forEach((payment) => {
      const date = normalizeDate(payment.paymentDate);

      if (!date) return;

      const current = dateMap.get(date) || {
        leads: 0,
        quotations: 0,
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        followUps: 0,
      };

      current.received += Number(payment.amountPaid) || 0;

      dateMap.set(date, current);
    });

    filteredFollowUps.forEach((followUp) => {
      const date = normalizeDate(followUp.followUpDate);

      if (!date) return;

      const current = dateMap.get(date) || {
        leads: 0,
        quotations: 0,
        invoices: 0,
        invoiceValue: 0,
        received: 0,
        followUps: 0,
      };

      current.followUps += 1;
      dateMap.set(date, current);
    });

    const rows = [...dateMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => [
        formatDate(date),
        data.leads,
        data.quotations,
        data.invoices,
        formatMoney(data.invoiceValue),
        <span className="font-medium text-green-700">
          {formatMoney(data.received)}
        </span>,
        data.followUps,
      ]);

    return (
      <ReportTable
        headers={[
          "Date",
          "Leads",
          "Quotations",
          "Invoices",
          "Invoice Value",
          "Received",
          "Follow-ups",
        ]}
        rows={rows}
      />
    );
  }

  function renderModeReport() {
    const modeMap = new Map<
      string,
      {
        count: number;
        amount: number;
      }
    >();

    filteredPayments.forEach((payment) => {
      const mode = payment.paymentMode || "Other";

      const current = modeMap.get(mode) || {
        count: 0,
        amount: 0,
      };

      current.count += 1;
      current.amount += Number(payment.amountPaid) || 0;

      modeMap.set(mode, current);
    });

    const rows = [...modeMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([mode, data]) => [
        mode,
        data.count,
        <span className="font-semibold text-green-700">
          {formatMoney(data.amount)}
        </span>,
      ]);

    return (
      <ReportTable
        headers={["Payment Mode", "Transactions", "Received"]}
        rows={rows}
      />
    );
  }

  function renderFollowUpReport() {
    const rows = [...filteredFollowUps]
      .sort((a, b) =>
        (a.followUpDate || "").localeCompare(b.followUpDate || ""),
      )
      .map((followUp) => [
        followUp.id,
        followUp.relatedType || "-",
        followUp.clientName || followUp.relatedName || "-",
        followUp.contactPerson || "-",
        formatDate(followUp.followUpDate),
        followUp.followUpTime || "-",
        followUp.assignedTo || "-",
        <StatusBadge key={`${followUp.id}-status`} status={followUp.status} />,
      ]);

    return (
      <ReportTable
        headers={[
          "Follow-up ID",
          "Related To",
          "Client / Lead",
          "Contact",
          "Date",
          "Time",
          "Assigned To",
          "Status",
        ]}
        rows={rows}
      />
    );
  }

  function renderSalesPersonReport() {
    const rows = salesPersons.map((person) => {
      const personLeads = filteredLeads.filter(
        (lead) =>
          lead.assignedTo === person.name ||
          lead.followUpAssignedTo === person.name,
      );

      const wonLeads = personLeads.filter((lead) => lead.status === "Won");

      const personQuotations = filteredQuotations.filter(
        (quotation) =>
          quotation.salesPersonId === person.id ||
          quotation.salesPersonName === person.name,
      );

      const quotationValue = personQuotations.reduce(
        (sum, quotation) => sum + (Number(quotation.grandTotal) || 0),
        0,
      );

      const personInvoices = filteredInvoices.filter((invoice) => {
        const quotationId = invoice.quotationId;

        if (!quotationId) return false;

        return personQuotations.some(
          (quotation) => quotation.id === quotationId,
        );
      });

      const invoiceValue = personInvoices.reduce(
        (sum, invoice) => sum + (Number(invoice.grandTotal) || 0),
        0,
      );

      const received = personInvoices.reduce((sum, invoice) => {
        const summary = getInvoicePaymentSummary(invoice);

        return sum + summary.totalPaid;
      }, 0);

      return [
        person.name,
        person.type,
        personLeads.length,
        wonLeads.length,
        formatMoney(
          personLeads.reduce(
            (sum, lead) => sum + (Number(lead.expectedValue) || 0),
            0,
          ),
        ),
        personQuotations.length,
        formatMoney(quotationValue),
        formatMoney(invoiceValue),
        <span className="font-semibold text-green-700">
          {formatMoney(received)}
        </span>,
      ];
    });

    return (
      <ReportTable
        headers={[
          "Sales Person",
          "Type",
          "Leads",
          "Won",
          "Pipeline",
          "Quotations",
          "Quotation Value",
          "Invoice Value",
          "Received",
        ]}
        rows={rows}
      />
    );
  }

  /* =========================================================
     CURRENT REPORT
  ========================================================= */

  function renderCurrentReport() {
    switch (reportType) {
      case "sales":
        return renderSalesReport();

      case "lead":
        return renderLeadReport();

      case "quotation":
        return renderQuotationReport();

      case "invoice":
        return renderInvoiceReport();

      case "received":
        return renderReceivedReport();

      case "outstanding":
        return renderOutstandingReport();

      case "cancelled":
        return renderCancelledReport();

      case "renewal":
        return renderRenewalReport();

      case "client":
        return renderClientReport();

      case "datewise":
        return renderDatewiseReport();

      case "mode":
        return renderModeReport();

      case "followup":
        return renderFollowUpReport();

      case "salesperson":
        return renderSalesPersonReport();

      default:
        return null;
    }
  }

  /* =========================================================
     CSV EXPORT
  ========================================================= */

  function handleDownload() {
    const filename = `bharatrath-${reportType}-report-${dateRange.from}-to-${dateRange.to}.csv`;

    switch (reportType) {
      case "sales": {
        downloadCSV(
          filename,
          ["Date", "Invoices", "Invoice Value", "Received", "Net Outstanding"],
          filteredInvoices.map((invoice) => {
            const summary = getInvoicePaymentSummary(invoice);

            return [
              normalizeDate(invoice.invoiceDate),
              1,
              invoice.grandTotal,
              summary.totalPaid,
              summary.balance,
            ];
          }),
        );
        break;
      }

      case "lead": {
        downloadCSV(
          filename,
          [
            "Lead ID",
            "Company",
            "Contact Person",
            "Phone",
            "Email",
            "Source",
            "Sales Person",
            "Expected Value",
            "Priority",
            "Status",
            "Created At",
          ],
          filteredLeads.map((lead) => [
            lead.id,
            lead.companyName,
            lead.contactPerson,
            lead.phone,
            lead.email,
            lead.leadSource,
            lead.assignedTo,
            lead.expectedValue,
            lead.priority,
            lead.status,
            lead.createdAt,
          ]),
        );
        break;
      }

      case "quotation": {
        downloadCSV(
          filename,
          [
            "Quotation No.",
            "Client",
            "Sales Person",
            "Quotation Date",
            "Grand Total",
            "Status",
          ],
          filteredQuotations.map((quotation) => [
            quotation.quotationNumber,
            quotation.clientName,
            quotation.salesPersonName || "",
            quotation.quotationDate,
            quotation.grandTotal,
            quotation.status,
          ]),
        );
        break;
      }

      case "invoice": {
        downloadCSV(
          filename,
          [
            "Invoice No.",
            "Client",
            "Invoice Date",
            "Grand Total",
            "Received",
            "Outstanding",
            "Status",
          ],
          filteredInvoices.map((invoice) => {
            const summary = getInvoicePaymentSummary(invoice);

            return [
              invoice.invoiceNumber,
              invoice.clientName,
              invoice.invoiceDate,
              invoice.grandTotal,
              summary.totalPaid,
              summary.balance,
              invoice.status,
            ];
          }),
        );
        break;
      }

      case "received": {
        downloadCSV(
          filename,
          [
            "Payment ID",
            "Invoice ID",
            "Payment Date",
            "Mode",
            "Reference",
            "Amount",
          ],
          filteredPayments.map((payment) => [
            payment.id,
            payment.invoiceId,
            payment.paymentDate,
            payment.paymentMode,
            payment.transactionNumber || "",
            payment.amountPaid,
          ]),
        );
        break;
      }

      case "outstanding": {
        downloadCSV(
          filename,
          [
            "Invoice No.",
            "Client",
            "Invoice Date",
            "Due Date",
            "Invoice Value",
            "Outstanding",
            "Status",
          ],
          filteredInvoices
            .map((invoice) => {
              const summary = getInvoicePaymentSummary(invoice);

              return {
                invoice,
                balance: summary.balance,
              };
            })
            .filter((item) => item.balance > 0)
            .map(({ invoice, balance }) => [
              invoice.invoiceNumber,
              invoice.clientName,
              invoice.invoiceDate,
              invoice.dueDate || "",
              invoice.grandTotal,
              balance,
              invoice.status,
            ]),
        );
        break;
      }

      case "cancelled": {
        downloadCSV(
          filename,
          [
            "Payment ID",
            "Invoice ID",
            "Payment Date",
            "Mode",
            "Amount",
            "Cancellation Reason",
          ],
          filteredCancelledPayments.map((payment) => [
            payment.id,
            payment.invoiceId,
            payment.paymentDate,
            payment.paymentMode,
            payment.amountPaid,
            payment.cancellationReason || "",
          ]),
        );
        break;
      }

      case "renewal": {
        downloadCSV(
          filename,
          [
            "Renewal ID",
            "Client",
            "Service",
            "Renewal Date",
            "Amount",
            "Status",
            "Notes",
          ],
          filteredRenewals.map((renewal) => [
            renewal.id,
            renewal.clientName,
            renewal.service,
            renewal.renewalDate,
            renewal.amount,
            renewal.status,
            renewal.notes || "",
          ]),
        );
        break;
      }

      case "client": {
        const clientMap = new Map<
          string,
          {
            client: string;
            invoices: number;
            invoiceValue: number;
            received: number;
            outstanding: number;
          }
        >();

        filteredInvoices.forEach((invoice) => {
          const key = invoice.clientId || invoice.clientName;

          const current = clientMap.get(key) || {
            client: invoice.clientName,
            invoices: 0,
            invoiceValue: 0,
            received: 0,
            outstanding: 0,
          };

          const summary = getInvoicePaymentSummary(invoice);

          current.invoices += 1;
          current.invoiceValue += invoice.grandTotal;
          current.received += summary.totalPaid;
          current.outstanding += summary.balance;

          clientMap.set(key, current);
        });

        downloadCSV(
          filename,
          ["Client", "Invoices", "Invoice Value", "Received", "Outstanding"],
          [...clientMap.values()].map((item) => [
            item.client,
            item.invoices,
            item.invoiceValue,
            item.received,
            item.outstanding,
          ]),
        );
        break;
      }

      case "datewise": {
        downloadCSV(
          filename,
          [
            "Date",
            "Leads",
            "Quotations",
            "Invoices",
            "Invoice Value",
            "Received",
            "Follow-ups",
          ],
          filteredInvoices.map((invoice) => [
            invoice.invoiceDate,
            filteredLeads.filter(
              (lead) =>
                normalizeDate(lead.createdAt) ===
                normalizeDate(invoice.invoiceDate),
            ).length,
            filteredQuotations.filter(
              (quotation) =>
                normalizeDate(quotation.quotationDate) ===
                normalizeDate(invoice.invoiceDate),
            ).length,
            1,
            invoice.grandTotal,
            0,
            filteredFollowUps.filter(
              (followUp) =>
                normalizeDate(followUp.followUpDate) ===
                normalizeDate(invoice.invoiceDate),
            ).length,
          ]),
        );
        break;
      }

      case "mode": {
        const modeMap = new Map<
          string,
          {
            count: number;
            amount: number;
          }
        >();

        filteredPayments.forEach((payment) => {
          const mode = payment.paymentMode || "Other";

          const current = modeMap.get(mode) || {
            count: 0,
            amount: 0,
          };

          current.count += 1;
          current.amount += payment.amountPaid;

          modeMap.set(mode, current);
        });

        downloadCSV(
          filename,
          ["Payment Mode", "Transactions", "Received"],
          [...modeMap.entries()].map(([mode, data]) => [
            mode,
            data.count,
            data.amount,
          ]),
        );
        break;
      }

      case "followup": {
        downloadCSV(
          filename,
          [
            "Follow-up ID",
            "Related Type",
            "Client / Lead",
            "Contact Person",
            "Date",
            "Time",
            "Assigned To",
            "Status",
          ],
          filteredFollowUps.map((followUp) => [
            followUp.id,
            followUp.relatedType || "",
            followUp.clientName || followUp.relatedName || "",
            followUp.contactPerson,
            followUp.followUpDate,
            followUp.followUpTime,
            followUp.assignedTo,
            followUp.status,
          ]),
        );
        break;
      }

      case "salesperson": {
        downloadCSV(
          filename,
          [
            "Sales Person",
            "Type",
            "Leads",
            "Won",
            "Pipeline",
            "Quotations",
            "Quotation Value",
            "Invoice Value",
            "Received",
          ],
          salesPersons.map((person) => {
            const personLeads = filteredLeads.filter(
              (lead) =>
                lead.assignedTo === person.name ||
                lead.followUpAssignedTo === person.name,
            );

            const won = personLeads.filter(
              (lead) => lead.status === "Won",
            ).length;

            const pipeline = personLeads.reduce(
              (sum, lead) => sum + (Number(lead.expectedValue) || 0),
              0,
            );

            const personQuotations = filteredQuotations.filter(
              (quotation) =>
                quotation.salesPersonId === person.id ||
                quotation.salesPersonName === person.name,
            );

            const quotationValue = personQuotations.reduce(
              (sum, quotation) => sum + (Number(quotation.grandTotal) || 0),
              0,
            );

            const personInvoices = filteredInvoices.filter((invoice) =>
              personQuotations.some(
                (quotation) => quotation.id === invoice.quotationId,
              ),
            );

            const invoiceValue = personInvoices.reduce(
              (sum, invoice) => sum + (Number(invoice.grandTotal) || 0),
              0,
            );

            const received = personInvoices.reduce(
              (sum, invoice) =>
                sum + getInvoicePaymentSummary(invoice).totalPaid,
              0,
            );

            return [
              person.name,
              person.type,
              personLeads.length,
              won,
              pipeline,
              personQuotations.length,
              quotationValue,
              invoiceValue,
              received,
            ];
          }),
        );
        break;
      }
    }
  }

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2742]">
            Reports
          </h1>

          <p className="mt-1 text-sm text-[#506B85]">
            Management reports, sales performance and business analytics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[#0B2742] transition hover:border-gray-400 hover:bg-gray-50"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-[#0B2742] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123A5C]"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* =====================================================
          MANAGEMENT SUMMARY
      ===================================================== */}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0B2742]">
              Management Summary
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              Key business performance indicators
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <ReportCard
            title="Total Leads"
            value={String(leadMetrics.total)}
            subtitle={`${leadMetrics.won} won`}
          />

          <ReportCard
            title="Conversion"
            value={`${leadMetrics.conversion.toFixed(1)}%`}
            subtitle={`${leadMetrics.won} won / ${leadMetrics.lost} lost`}
          />

          <ReportCard
            title="Pipeline Value"
            value={formatMoney(leadMetrics.pipelineValue)}
            subtitle="Open opportunities"
          />

          <ReportCard
            title="Quotation Value"
            value={formatMoney(commercialMetrics.quotationValue)}
            subtitle={`${filteredQuotations.length} quotations`}
          />

          <ReportCard
            title="Invoice Value"
            value={formatMoney(commercialMetrics.invoiceValue)}
            subtitle={`${filteredInvoices.length} invoices`}
          />

          <ReportCard
            title="Received"
            value={formatMoney(commercialMetrics.totalReceived)}
            subtitle="Payments received"
          />

          <ReportCard
            title="Outstanding"
            value={formatMoney(commercialMetrics.outstanding)}
            subtitle="Balance pending"
          />

          <ReportCard
            title="Overdue"
            value={formatMoney(commercialMetrics.overdue)}
            subtitle="Overdue invoice balance"
          />

          <ReportCard
            title="Upcoming Renewals"
            value={String(renewalMetrics.upcoming)}
            subtitle={formatMoney(renewalMetrics.upcomingValue)}
          />

          <ReportCard
            title="Renewal Overdue"
            value={String(renewalMetrics.overdue)}
            subtitle={formatMoney(renewalMetrics.overdueValue)}
          />
        </div>
      </div>

      {/* =====================================================
          DATE FILTER
      ===================================================== */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 text-sm font-semibold text-[#0B2742]">
              Report Period
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["today", "Today"],
                ["yesterday", "Yesterday"],
                ["last7", "Last 7 Days"],
                ["last30", "Last 30 Days"],
                ["lastYear", "Last 1 Year"],
                ["custom", "Custom"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyPeriod(value as Period)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    period === value
                      ? "border-green-600 bg-green-600 text-white shadow-sm"
                      : "border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#F4F7FA] px-3 py-2 text-sm font-medium text-[#506B85]">
            {formatDate(dateRange.from)}
            <span className="mx-2 text-gray-400">→</span>
            {formatDate(dateRange.to)}
          </div>
        </div>

        {period === "custom" && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-[#F8FAFC] p-3 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#506B85]">
                From
              </label>

              <input
                type="date"
                value={customRange.from}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#506B85]">
                To
              </label>

              <input
                type="date"
                value={customRange.to}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          REPORT TABS
      ===================================================== */}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                reportType === tab.id
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-[#506B85] hover:bg-green-50 hover:text-green-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================
          CURRENT REPORT
      ===================================================== */}

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0B2742]">
              {reportTabs.find((tab) => tab.id === reportType)?.label} Report
            </h2>

            <p className="text-sm text-gray-500">
              {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
            </p>
          </div>

          <div className="text-sm font-medium text-[#506B85]">
            {reportType === "lead" && `${filteredLeads.length} leads`}

            {reportType === "quotation" &&
              `${filteredQuotations.length} quotations`}

            {reportType === "invoice" && `${filteredInvoices.length} invoices`}

            {reportType === "renewal" && `${filteredRenewals.length} renewals`}

            {reportType === "followup" &&
              `${filteredFollowUps.length} follow-ups`}
          </div>
        </div>

        {renderCurrentReport()}
      </div>
    </div>
  );
}
