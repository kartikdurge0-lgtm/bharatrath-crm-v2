import { useRef, useState } from "react";
import {
  addLead,
  generateLeadId,
  type Lead,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "../data/leadStore";

type Props = {
  onClose: () => void;
  onImported?: () => void;
};

type CSVRow = {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  leadSource: string;
  assignedTo: string;
  requirement: string;
  interestedService: string;
  priority: string;
  status: string;
  expectedValue: string;
  nextFollowUpDate: string;
  nextAction: string;
  notes: string;
};

type PreviewRow = CSVRow & {
  rowNumber: number;
  errors: string[];
};

const HEADERS = [
  "companyName",
  "contactPerson",
  "phone",
  "email",
  "leadSource",
  "assignedTo",
  "requirement",
  "interestedService",
  "priority",
  "status",
  "expectedValue",
  "nextFollowUpDate",
  "nextAction",
  "notes",
];

const SAMPLE_ROW = [
  "ABC Enterprises",
  "Rahul Sharma",
  "9876543210",
  "rahul@example.com",
  "Website",
  "",
  "Website development",
  "Website",
  "Medium",
  "New",
  "50000",
  "2026-09-10",
  "Call customer",
  "Interested in business website",
];

const VALID_PRIORITIES: LeadPriority[] = ["High", "Medium", "Low"];

const VALID_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Follow-up",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost",
];

const VALID_SOURCES: LeadSource[] = [
  "Website",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "Referral",
  "Event",
  "Existing Client",
  "Cold Call",
  "Other",
];

/* =====================================================
   CSV PARSER
===================================================== */

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];

  let currentRow = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        currentRow += '""';
        i++;
      } else {
        insideQuotes = !insideQuotes;
        currentRow += char;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (currentRow.trim()) {
        rows.push(parseCSVLine(currentRow));
      }

      currentRow = "";

      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
    } else {
      currentRow += char;
    }
  }

  if (currentRow.trim()) {
    rows.push(parseCSVLine(currentRow));
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeValue(value: string | undefined): string {
  return (value ?? "").trim();
}

/* =====================================================
   NORMALIZATION
===================================================== */

function normalizePriority(value: string): LeadPriority {
  const found = VALID_PRIORITIES.find(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );

  return found ?? "Medium";
}

function normalizeStatus(value: string): LeadStatus {
  const found = VALID_STATUSES.find(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );

  return found ?? "New";
}

function normalizeSource(value: string): LeadSource {
  const found = VALID_SOURCES.find(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );

  return found ?? "Other";
}

function parseExpectedValue(value: string): number {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(/,/g, "").trim());

  return Number.isFinite(number) && number >= 0 ? number : 0;
}

/* =====================================================
   VALIDATION
===================================================== */

function validateRow(row: CSVRow, rowNumber: number): PreviewRow {
  const errors: string[] = [];

  if (!row.companyName) {
    errors.push("Company Name is required");
  }

  if (!row.contactPerson) {
    errors.push("Contact Person is required");
  }

  if (!row.phone) {
    errors.push("Phone is required");
  } else {
    const digits = row.phone.replace(/\D/g, "");

    if (digits.length < 10) {
      errors.push("Phone must contain at least 10 digits");
    }
  }

  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(row.email)) {
      errors.push("Invalid email");
    }
  }

  if (row.leadSource) {
    const exists = VALID_SOURCES.some(
      (source) => source.toLowerCase() === row.leadSource.toLowerCase(),
    );

    if (!exists) {
      errors.push(`Invalid Lead Source. Use: ${VALID_SOURCES.join(", ")}`);
    }
  }

  if (row.priority) {
    const exists = VALID_PRIORITIES.some(
      (priority) => priority.toLowerCase() === row.priority.toLowerCase(),
    );

    if (!exists) {
      errors.push(`Invalid Priority. Use: ${VALID_PRIORITIES.join(", ")}`);
    }
  }

  if (row.status) {
    const exists = VALID_STATUSES.some(
      (status) => status.toLowerCase() === row.status.toLowerCase(),
    );

    if (!exists) {
      errors.push(`Invalid Status. Use: ${VALID_STATUSES.join(", ")}`);
    }
  }

  if (row.expectedValue) {
    const value = Number(row.expectedValue.replace(/,/g, ""));

    if (Number.isNaN(value) || value < 0) {
      errors.push("Expected Value must be a valid number");
    }
  }

  if (row.nextFollowUpDate) {
    const date = new Date(row.nextFollowUpDate);

    if (Number.isNaN(date.getTime())) {
      errors.push("Invalid Follow-up Date");
    }
  }

  return {
    ...row,
    rowNumber,
    errors,
  };
}

/* =====================================================
   DOWNLOAD TEMPLATE
===================================================== */

function downloadTemplate() {
  const csvContent = [
    HEADERS.join(","),
    SAMPLE_ROW.map((value) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(","),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "Bharatrath_Lead_Bulk_Upload_Template.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* =====================================================
   COMPONENT
===================================================== */

export default function BulkLeadUpload({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  /* ===================================================
     FILE CHANGE
  =================================================== */

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setMessage("");
    setImportedCount(0);
    setPreviewRows([]);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");

        if (!text.trim()) {
          setMessage("CSV file is empty.");
          setIsProcessing(false);
          return;
        }

        const rows = parseCSV(text);

        if (rows.length < 2) {
          setMessage(
            "CSV must contain a header row and at least one data row.",
          );
          setIsProcessing(false);
          return;
        }

        const headers = rows[0].map(normalizeHeader);

        const requiredHeaders = ["companyname", "contactperson", "phone"];

        const missingHeaders = requiredHeaders.filter(
          (required) => !headers.includes(required),
        );

        if (missingHeaders.length > 0) {
          setMessage(`Missing required columns: ${missingHeaders.join(", ")}`);
          setIsProcessing(false);
          return;
        }

        const parsedRows: PreviewRow[] = [];

        rows.slice(1).forEach((values, index) => {
          const rowObject: Record<string, string> = {};

          headers.forEach((header, headerIndex) => {
            rowObject[header] = normalizeValue(values[headerIndex]);
          });

          const row: CSVRow = {
            companyName: rowObject.companyname || "",

            contactPerson: rowObject.contactperson || "",

            phone: rowObject.phone || "",

            email: rowObject.email || "",

            leadSource: rowObject.leadsource || "",

            assignedTo: rowObject.assignedto || "",

            requirement: rowObject.requirement || "",

            interestedService: rowObject.interestedservice || "",

            priority: rowObject.priority || "",

            status: rowObject.status || "",

            expectedValue: rowObject.expectedvalue || "",

            nextFollowUpDate: rowObject.nextfollowupdate || "",

            nextAction: rowObject.nextaction || "",

            notes: rowObject.notes || "",
          };

          const isEmpty = Object.values(row).every((value) => !value);

          if (isEmpty) {
            return;
          }

          parsedRows.push(validateRow(row, index + 2));
        });

        setPreviewRows(parsedRows);

        if (parsedRows.length === 0) {
          setMessage("No valid data rows found in the CSV.");
        }
      } catch {
        setMessage("Unable to read this CSV file. Please check the format.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setMessage("Unable to read the selected file.");
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  /* ===================================================
     COUNTS
  =================================================== */

  const validRows = previewRows.filter((row) => row.errors.length === 0);

  const errorRows = previewRows.filter((row) => row.errors.length > 0);

  /* ===================================================
     ACTUAL IMPORT
  =================================================== */

  const handleImport = () => {
    if (validRows.length === 0) {
      setMessage("There are no valid leads to import.");
      return;
    }

    setIsImporting(true);
    setMessage("");

    try {
      let imported = 0;

      validRows.forEach((row) => {
        const lead: Lead = {
          id: generateLeadId(),

          companyName: row.companyName,

          contactPerson: row.contactPerson,

          phone: row.phone,

          email: row.email,

          address: "",

          leadSource: normalizeSource(row.leadSource),

          sourceDetails: "",

          assignedTo: row.assignedTo,

          followUpAssignedTo: "",

          referencePersonName: "",
          referencePersonPhone: "",
          referencePersonEmail: "",

          commissionApplicable: false,
          commissionPercent: 0,
          commissionAmount: 0,
          commissionStatus: "Not Applicable",

          requirement: row.requirement,

          interestedService: row.interestedService,

          priority: normalizePriority(row.priority),

          status: normalizeStatus(row.status),

          expectedValue: parseExpectedValue(row.expectedValue),

          expectedClosingDate: "",

          notes: row.notes,

          internalNotes: "",

          nextFollowUpDate: row.nextFollowUpDate,

          nextFollowUpTime: "",

          nextAction: row.nextAction,

          createdAt: new Date().toISOString(),
        };

        addLead(lead);

        imported++;
      });

      setImportedCount(imported);

      setMessage(
        `${imported} lead${imported !== 1 ? "s" : ""} imported successfully.`,
      );

      onImported?.();
    } catch {
      setMessage("Something went wrong while importing leads.");
    } finally {
      setIsImporting(false);
    }
  };

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Leads</h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload multiple leads using a CSV file.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* UPLOAD CARDS */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* TEMPLATE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-900">
                  Step 1: Download Template
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Use the Bharatrath CSV format to avoid validation errors.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
              >
                ↓ Download CSV Template
              </button>
            </div>

            {/* UPLOAD */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-900">
                  Step 2: Upload CSV
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select your completed CSV file.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                ↑ Select CSV File
              </button>

              {fileName && (
                <p className="mt-2 text-sm text-slate-600">
                  Selected:{" "}
                  <span className="font-medium text-slate-900">{fileName}</span>
                </p>
              )}
            </div>
          </div>

          {/* COLUMNS INFO */}
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900">CSV Columns</h3>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Required:{" "}
              <span className="font-semibold">
                companyName, contactPerson, phone
              </span>
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Optional: email, leadSource, assignedTo, requirement,
              interestedService, priority, status, expectedValue,
              nextFollowUpDate, nextAction, notes
            </p>
          </div>

          {/* PROCESSING */}
          {isProcessing && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Reading and validating CSV...
            </div>
          )}

          {/* MESSAGE */}
          {message && (
            <div
              className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
                importedCount > 0
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* SUMMARY */}
          {previewRows.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Rows
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {previewRows.length}
                </p>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                  Valid Leads
                </p>

                <p className="mt-1 text-2xl font-bold text-green-700">
                  {validRows.length}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-red-700">
                  Errors
                </p>

                <p className="mt-1 text-2xl font-bold text-red-700">
                  {errorRows.length}
                </p>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {previewRows.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="font-semibold text-slate-900">Preview</h3>
              </div>

              <div className="max-h-[380px] overflow-auto">
                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Row</th>
                      <th className="px-3 py-3">Company</th>
                      <th className="px-3 py-3">Contact</th>
                      <th className="px-3 py-3">Phone</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Sales Person</th>
                      <th className="px-3 py-3">Service</th>
                      <th className="px-3 py-3">Value</th>
                      <th className="px-3 py-3">Follow-up</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Validation</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.errors.length > 0 ? "bg-red-50/60" : "bg-white"
                        }
                      >
                        <td className="px-3 py-3 font-medium text-slate-500">
                          {row.rowNumber}
                        </td>

                        <td className="px-3 py-3 font-medium text-slate-900">
                          {row.companyName || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.contactPerson || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.phone || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.leadSource || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.assignedTo || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.interestedService || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.expectedValue || "0"}
                        </td>

                        <td className="px-3 py-3 text-slate-700">
                          {row.nextFollowUpDate || "—"}
                        </td>

                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {row.priority || "Medium"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {row.status || "New"}
                          </span>
                        </td>

                        <td className="max-w-[280px] px-3 py-3">
                          {row.errors.length === 0 ? (
                            <span className="font-medium text-green-600">
                              ✓ Valid
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {row.errors.map((error, index) => (
                                <p
                                  key={index}
                                  className="text-xs font-medium text-red-600"
                                >
                                  • {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isProcessing && !fileName && previewRows.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="text-3xl">📄</div>

              <h3 className="mt-3 font-semibold text-slate-900">
                No CSV selected
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Download the template, fill your leads, and upload the CSV.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <div className="text-sm text-slate-500">
            {previewRows.length > 0
              ? `${validRows.length} valid of ${previewRows.length} rows`
              : "Ready to upload"}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={isProcessing || isImporting || validRows.length === 0}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isImporting
                ? "Importing..."
                : `Import ${validRows.length} Leads`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
