import React, { useEffect, useMemo, useState } from "react";

import { getActivityLogs, type ActivityLog } from "../data/activityLogStore";

import {
  getActiveSalesPersons,
  addSalesPerson,
  updateSalesPerson,
  deactivateSalesPerson,
  type SalesPerson,
  type SalesPersonType,
} from "../data/salesPersonStore";

type SettingsSection =
  | "business"
  | "team"
  | "invoice"
  | "quotation"
  | "payment"
  | "notifications"
  | "preferences"
  | "data"
  | "activity";

type BusinessSettings = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  website: string;
};

type InvoiceSettings = {
  prefix: string;
  nextNumber: string;
  defaultGst: string;
  paymentTerms: string;
  notes: string;
  terms: string;
};

type QuotationSettings = {
  prefix: string;
  nextNumber: string;
  validity: string;
  notes: string;
  terms: string;
};

type PaymentSettings = {
  modes: string[];
  defaultMode: string;
};

type NotificationSettings = {
  paymentReminder: boolean;
  followUpReminder: boolean;
  renewalReminder: boolean;
};

type PreferenceSettings = {
  language: string;
  currency: string;
  dateFormat: string;
};

const PAGE_SIZE = 6;

const BUSINESS_KEY = "crm-settings-business";
const INVOICE_KEY = "crm-settings-invoice";
const QUOTATION_KEY = "crm-settings-quotation";
const PAYMENT_KEY = "crm-settings-payment";
const NOTIFICATION_KEY = "crm-settings-notifications";
const PREFERENCE_KEY = "crm-settings-preferences";

const defaultBusiness: BusinessSettings = {
  businessName: "Bharatrath",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  website: "",
};

const defaultInvoice: InvoiceSettings = {
  prefix: "INV-",
  nextNumber: "001",
  defaultGst: "18",
  paymentTerms: "15",
  notes: "",
  terms: "",
};

const defaultQuotation: QuotationSettings = {
  prefix: "QUO-",
  nextNumber: "001",
  validity: "15",
  notes: "",
  terms: "",
};

const defaultPayment: PaymentSettings = {
  modes: ["Cash", "UPI", "Bank Transfer", "Cheque"],
  defaultMode: "UPI",
};

const defaultNotifications: NotificationSettings = {
  paymentReminder: true,
  followUpReminder: true,
  renewalReminder: true,
};

const defaultPreferences: PreferenceSettings = {
  language: "English",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
};

function loadSetting<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);

  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function saveSetting<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/* --------------------------------
   Activity sorting
   Latest activity first
-------------------------------- */

function sortActivityLogsLatestFirst(a: ActivityLog, b: ActivityLog): number {
  const dateA = new Date(a.created_at).getTime();
  const dateB = new Date(b.created_at).getTime();

  if (dateA !== dateB) {
    return dateB - dateA;
  }

  return String(b.id).localeCompare(String(a.id));
}

export default function Settings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("business");

  const [business, setBusiness] = useState<BusinessSettings>(() =>
    loadSetting(BUSINESS_KEY, defaultBusiness),
  );

  const [invoice, setInvoice] = useState<InvoiceSettings>(() =>
    loadSetting(INVOICE_KEY, defaultInvoice),
  );

  const [quotation, setQuotation] = useState<QuotationSettings>(() =>
    loadSetting(QUOTATION_KEY, defaultQuotation),
  );

  const [payment, setPayment] = useState<PaymentSettings>(() =>
    loadSetting(PAYMENT_KEY, defaultPayment),
  );

  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    loadSetting(NOTIFICATION_KEY, defaultNotifications),
  );

  const [preferences, setPreferences] = useState<PreferenceSettings>(() =>
    loadSetting(PREFERENCE_KEY, defaultPreferences),
  );

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityUserFilter, setActivityUserFilter] = useState("All Users");
  const [activityModuleFilter, setActivityModuleFilter] =
    useState("All Modules");
  const [activityActionFilter, setActivityActionFilter] =
    useState("All Actions");

  const [activityCurrentPage, setActivityCurrentPage] = useState(1);

  const [newPaymentMode, setNewPaymentMode] = useState("");

  const [showSalesPersonForm, setShowSalesPersonForm] = useState(false);

  const [editingSalesPersonId, setEditingSalesPersonId] = useState<
    string | null
  >(null);

  const [salesPersonForm, setSalesPersonForm] = useState({
    name: "",
    mobile: "",
    email: "",
    type: "Staff" as SalesPersonType,
    commissionPercent: "0",
    notes: "",
  });

  const [message, setMessage] = useState("");

  /* --------------------------------
     Load data
  -------------------------------- */

  const refreshActivityLogs = async () => {
    try {
      const logs = await getActivityLogs();

      setActivityLogs(logs);
      setActivityCurrentPage(1);
    } catch (error) {
      console.error("Failed to load activity logs:", error);

      setActivityLogs([]);
      setActivityCurrentPage(1);
    }
  };

  const refreshSalesPersons = async () => {
    try {
      const persons = await getActiveSalesPersons();

      setSalesPersons(persons);
    } catch (error) {
      console.error("Failed to load sales persons:", error);

      setSalesPersons([]);
    }
  };

  useEffect(() => {
    void refreshSalesPersons();
    void refreshActivityLogs();
  }, []);

  /* --------------------------------
     Messages
  -------------------------------- */

  const showSaved = (text = "Settings saved successfully.") => {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  /* --------------------------------
     Settings save
  -------------------------------- */

  const saveBusiness = () => {
    saveSetting(BUSINESS_KEY, business);
    showSaved();
  };

  const saveInvoice = () => {
    saveSetting(INVOICE_KEY, invoice);
    showSaved();
  };

  const saveQuotation = () => {
    saveSetting(QUOTATION_KEY, quotation);
    showSaved();
  };

  const savePayment = () => {
    saveSetting(PAYMENT_KEY, payment);
    showSaved();
  };

  const saveNotifications = () => {
    saveSetting(NOTIFICATION_KEY, notifications);
    showSaved();
  };

  const savePreferences = () => {
    saveSetting(PREFERENCE_KEY, preferences);
    showSaved();
  };

  /* --------------------------------
     Sales Person form
  -------------------------------- */

  const resetSalesPersonForm = () => {
    setSalesPersonForm({
      name: "",
      mobile: "",
      email: "",
      type: "Staff",
      commissionPercent: "0",
      notes: "",
    });

    setEditingSalesPersonId(null);
    setShowSalesPersonForm(false);
  };

  const openAddSalesPerson = () => {
    setSalesPersonForm({
      name: "",
      mobile: "",
      email: "",
      type: "Staff",
      commissionPercent: "0",
      notes: "",
    });

    setEditingSalesPersonId(null);
    setShowSalesPersonForm(true);
  };

  const openEditSalesPerson = (person: SalesPerson) => {
    setSalesPersonForm({
      name: person.name,
      mobile: person.mobile,
      email: person.email,
      type: person.type,
      commissionPercent: String(person.commissionPercent),
      notes: person.notes,
    });

    setEditingSalesPersonId(person.id);
    setShowSalesPersonForm(true);
  };

  const saveSalesPerson = async () => {
    const name = salesPersonForm.name.trim();

    if (!name) {
      setMessage("Sales Person name is required.");
      return;
    }

    const commission = Math.max(
      0,
      Number(salesPersonForm.commissionPercent) || 0,
    );

    if (commission > 100) {
      setMessage("Commission cannot be more than 100%.");
      return;
    }

    try {
      if (editingSalesPersonId) {
        await updateSalesPerson(editingSalesPersonId, {
          name,
          mobile: salesPersonForm.mobile.trim(),
          email: salesPersonForm.email.trim(),
          type: salesPersonForm.type,
          commissionPercent: commission,
          notes: salesPersonForm.notes.trim(),
        });

        await refreshSalesPersons();

        resetSalesPersonForm();

        showSaved("Sales Person updated successfully.");

        return;
      }

      await addSalesPerson({
        name,
        mobile: salesPersonForm.mobile.trim(),
        email: salesPersonForm.email.trim(),
        type: salesPersonForm.type,
        commissionPercent: commission,
        status: "Active",
        notes: salesPersonForm.notes.trim(),
      });

      await refreshSalesPersons();

      resetSalesPersonForm();

      showSaved("Sales Person added successfully.");
    } catch (error) {
      console.error("Failed to save sales person:", error);

      setMessage("Failed to save Sales Person. Please try again.");
    }
  };

  const handleDeactivate = async (person: SalesPerson) => {
    const confirmed = window.confirm(
      `Deactivate ${person.name}? They will no longer appear in new Lead / Quotation selections.`,
    );

    if (!confirmed) return;

    try {
      await deactivateSalesPerson(person.id);

      await refreshSalesPersons();

      showSaved("Sales Person deactivated.");
    } catch (error) {
      console.error("Failed to deactivate sales person:", error);

      setMessage("Failed to deactivate Sales Person. Please try again.");
    }
  };

  /* --------------------------------
     Payment modes
  -------------------------------- */

  const addPaymentMode = () => {
    const mode = newPaymentMode.trim();

    if (!mode) return;

    const exists = payment.modes.some(
      (item) => item.toLowerCase() === mode.toLowerCase(),
    );

    if (exists) {
      setNewPaymentMode("");
      return;
    }

    setPayment((current) => ({
      ...current,
      modes: [...current.modes, mode],
    }));

    setNewPaymentMode("");
  };

  const removePaymentMode = (modeToRemove: string) => {
    if (payment.modes.length <= 1) return;

    setPayment((current) => {
      const modes = current.modes.filter((mode) => mode !== modeToRemove);

      return {
        ...current,
        modes,
        defaultMode:
          current.defaultMode === modeToRemove ? modes[0] : current.defaultMode,
      };
    });
  };

  /* --------------------------------
     Activity filters
  -------------------------------- */

  const activityUsers = useMemo(() => {
    const users = activityLogs
      .map((log) => log.user_name || log.user_email || "Unknown User")
      .filter(Boolean);

    return Array.from(new Set(users));
  }, [activityLogs]);

  const activityModules = useMemo(
    () => Array.from(new Set(activityLogs.map((log) => log.module))),
    [activityLogs],
  );

  const activityActions = useMemo(
    () => Array.from(new Set(activityLogs.map((log) => log.action))),
    [activityLogs],
  );

  /* --------------------------------
     Activity
     Filter → Sort
  -------------------------------- */

  const filteredActivityLogs = useMemo(() => {
    const search = activitySearch.trim().toLowerCase();

    return activityLogs
      .filter((log) => {
        const user = log.user_name || log.user_email || "Unknown User";

        const matchesSearch =
          !search ||
          user.toLowerCase().includes(search) ||
          (log.user_email || "").toLowerCase().includes(search) ||
          (log.description || "").toLowerCase().includes(search) ||
          (log.record_id || "").toLowerCase().includes(search) ||
          (log.record_name || "").toLowerCase().includes(search);

        const matchesUser =
          activityUserFilter === "All Users" || user === activityUserFilter;

        const matchesModule =
          activityModuleFilter === "All Modules" ||
          log.module === activityModuleFilter;

        const matchesAction =
          activityActionFilter === "All Actions" ||
          log.action === activityActionFilter;

        return matchesSearch && matchesUser && matchesModule && matchesAction;
      })
      .sort(sortActivityLogsLatestFirst);
  }, [
    activityLogs,
    activitySearch,
    activityUserFilter,
    activityModuleFilter,
    activityActionFilter,
  ]);

  /* --------------------------------
     Reset activity pagination
  -------------------------------- */

  useEffect(() => {
    setActivityCurrentPage(1);
  }, [
    activitySearch,
    activityUserFilter,
    activityModuleFilter,
    activityActionFilter,
  ]);

  /* --------------------------------
     Activity pagination
  -------------------------------- */

  const activityTotalPages = Math.ceil(filteredActivityLogs.length / PAGE_SIZE);

  useEffect(() => {
    if (activityTotalPages === 0 && activityCurrentPage !== 1) {
      setActivityCurrentPage(1);
      return;
    }

    if (activityTotalPages > 0 && activityCurrentPage > activityTotalPages) {
      setActivityCurrentPage(activityTotalPages);
    }
  }, [activityCurrentPage, activityTotalPages]);

  const paginatedActivityLogs = useMemo(() => {
    const startIndex = (activityCurrentPage - 1) * PAGE_SIZE;

    return filteredActivityLogs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredActivityLogs, activityCurrentPage]);

  /* --------------------------------
     Activity page numbers
  -------------------------------- */

  const activityPageNumbers = useMemo(() => {
    if (activityTotalPages <= 5) {
      return Array.from(
        { length: activityTotalPages },
        (_, index) => index + 1,
      );
    }

    const pages = new Set<number>();

    pages.add(1);
    pages.add(2);
    pages.add(activityTotalPages - 1);
    pages.add(activityTotalPages);
    pages.add(activityCurrentPage);

    if (activityCurrentPage > 1) {
      pages.add(activityCurrentPage - 1);
    }

    if (activityCurrentPage < activityTotalPages) {
      pages.add(activityCurrentPage + 1);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= activityTotalPages)
      .sort((a, b) => a - b);
  }, [activityCurrentPage, activityTotalPages]);

  /* --------------------------------
     Sections
  -------------------------------- */

  const sections: {
    key: SettingsSection;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      key: "business",
      label: "Business Profile",
      icon: "🏢",
      description: "Business identity and contact details",
    },
    {
      key: "team",
      label: "Team & Sales Persons",
      icon: "👥",
      description: "Manage sales and referral persons",
    },
    {
      key: "invoice",
      label: "Invoice Settings",
      icon: "🧾",
      description: "Invoice numbering and defaults",
    },
    {
      key: "quotation",
      label: "Quotation Settings",
      icon: "📋",
      description: "Quotation numbering and validity",
    },
    {
      key: "payment",
      label: "Payment Settings",
      icon: "💳",
      description: "Payment modes and defaults",
    },
    {
      key: "notifications",
      label: "Reminders",
      icon: "🔔",
      description: "Payment, follow-up and renewal reminders",
    },
    {
      key: "preferences",
      label: "Preferences",
      icon: "🌐",
      description: "Language, currency and date format",
    },
    {
      key: "activity",
      label: "Activity History",
      icon: "🕘",
      description: "Track CRM user activities",
    },
    {
      key: "data",
      label: "Data & Backup",
      icon: "💾",
      description: "Data export and backup tools",
    },
  ];

  return (
    <div className="min-h-full min-w-0 bg-slate-50">
      {/* PAGE HEADER */}

      <div className="mb-5 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your Bharatrath CRM settings
        </p>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className="mb-5 break-words rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ {message}
        </div>
      )}

      {/* MAIN SETTINGS LAYOUT */}

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* LEFT NAVIGATION */}

        <aside className="min-w-0 h-fit rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="mb-2 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Settings
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-1">
            {sections.map((section) => {
              const active = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full min-w-0 rounded-lg px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-green-50 text-green-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base ${
                        active
                          ? "bg-white text-green-600"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {section.icon}
                    </span>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {section.label}
                      </div>

                      <div
                        className={`mt-0.5 text-[11px] leading-4 ${
                          active ? "text-green-600/70" : "text-slate-400"
                        }`}
                      >
                        {section.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* BUSINESS PROFILE */}

          {activeSection === "business" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Business Profile"
                description="Basic information used throughout the CRM."
                accent="green"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Business / Company Name"
                  value={business.businessName}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      businessName: value,
                    })
                  }
                />

                <InputField
                  label="Owner / Contact Person"
                  value={business.ownerName}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      ownerName: value,
                    })
                  }
                />

                <InputField
                  label="Phone"
                  value={business.phone}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      phone: value,
                    })
                  }
                />

                <InputField
                  label="Email"
                  type="email"
                  value={business.email}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      email: value,
                    })
                  }
                />

                <InputField
                  label="GSTIN"
                  value={business.gstin}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      gstin: value,
                    })
                  }
                />

                <InputField
                  label="Website"
                  value={business.website}
                  onChange={(value) =>
                    setBusiness({
                      ...business,
                      website: value,
                    })
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Business Address"
                    value={business.address}
                    rows={3}
                    onChange={(value) =>
                      setBusiness({
                        ...business,
                        address: value,
                      })
                    }
                  />
                </div>
              </div>

              <SaveButton onClick={saveBusiness} />
            </section>
          )}

          {/* TEAM */}

          {activeSection === "team" && (
            <section className="p-4 sm:p-5 md:p-6">
              <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Team & Sales Persons"
                  description="Manage internal team members and external referral / sales persons."
                  accent="blue"
                />

                <button
                  type="button"
                  onClick={openAddSalesPerson}
                  className="w-full shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 sm:w-auto"
                >
                  + Add Sales Person
                </button>
              </div>

              {showSalesPersonForm && (
                <div className="mt-5 min-w-0 rounded-xl border border-green-200 bg-green-50/60 p-4 sm:p-5">
                  <div className="mb-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        👤
                      </span>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          {editingSalesPersonId
                            ? "Edit Sales Person"
                            : "Add Sales Person"}
                        </h3>

                        <p className="mt-0.5 break-words text-xs text-slate-500">
                          Staff / Part-time are internal CRM users. External is
                          for referral or commission sources.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputField
                      label="Name *"
                      value={salesPersonForm.name}
                      onChange={(value) =>
                        setSalesPersonForm({
                          ...salesPersonForm,
                          name: value,
                        })
                      }
                    />

                    <InputField
                      label="Mobile"
                      value={salesPersonForm.mobile}
                      onChange={(value) =>
                        setSalesPersonForm({
                          ...salesPersonForm,
                          mobile: value,
                        })
                      }
                    />

                    <InputField
                      label="Email"
                      type="email"
                      value={salesPersonForm.email}
                      onChange={(value) =>
                        setSalesPersonForm({
                          ...salesPersonForm,
                          email: value,
                        })
                      }
                    />

                    <SelectField
                      label="Type"
                      value={salesPersonForm.type}
                      options={["Staff", "Part-time", "External"]}
                      onChange={(value) =>
                        setSalesPersonForm({
                          ...salesPersonForm,
                          type: value as SalesPersonType,
                        })
                      }
                    />

                    <InputField
                      label="Commission (%)"
                      type="number"
                      value={salesPersonForm.commissionPercent}
                      onChange={(value) =>
                        setSalesPersonForm({
                          ...salesPersonForm,
                          commissionPercent: value,
                        })
                      }
                    />

                    <div className="md:col-span-2">
                      <TextAreaField
                        label="Notes"
                        value={salesPersonForm.notes}
                        rows={3}
                        onChange={(value) =>
                          setSalesPersonForm({
                            ...salesPersonForm,
                            notes: value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={saveSalesPerson}
                      className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                    >
                      {editingSalesPersonId
                        ? "Update Sales Person"
                        : "Save Sales Person"}
                    </button>

                    <button
                      type="button"
                      onClick={resetSalesPersonForm}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 min-w-0">
                <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      Active Sales Persons
                    </h3>

                    <p className="mt-1 break-words text-xs text-slate-500">
                      These persons appear in Lead and Quotation selections.
                    </p>
                  </div>

                  <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    {salesPersons.length} Active
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[780px] w-full text-sm">
                    <thead className="bg-[#F4F7FA]">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                          Name
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                          Type
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                          Mobile
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                          Commission
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {salesPersons.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No active sales persons found.
                          </td>
                        </tr>
                      ) : (
                        salesPersons.map((person) => (
                          <tr
                            key={person.id}
                            className="border-t border-slate-100 hover:bg-slate-50/60"
                          >
                            <td className="max-w-[260px] px-4 py-3">
                              <div
                                className="truncate font-semibold text-slate-900"
                                title={person.name}
                              >
                                {person.name}
                              </div>

                              {person.email && (
                                <div
                                  className="mt-0.5 max-w-[240px] truncate text-xs text-slate-400"
                                  title={person.email}
                                >
                                  {person.email}
                                </div>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {person.type}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                              {person.mobile || "-"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                              {person.commissionPercent}%
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditSalesPerson(person)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(person)}
                                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                                >
                                  Deactivate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* INVOICE */}

          {activeSection === "invoice" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Invoice Settings"
                description="Configure invoice numbering and default invoice values."
                accent="blue"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Invoice Prefix"
                  value={invoice.prefix}
                  onChange={(value) =>
                    setInvoice({
                      ...invoice,
                      prefix: value,
                    })
                  }
                />

                <InputField
                  label="Next Invoice Number"
                  value={invoice.nextNumber}
                  onChange={(value) =>
                    setInvoice({
                      ...invoice,
                      nextNumber: value,
                    })
                  }
                />

                <InputField
                  label="Default GST (%)"
                  type="number"
                  value={invoice.defaultGst}
                  onChange={(value) =>
                    setInvoice({
                      ...invoice,
                      defaultGst: value,
                    })
                  }
                />

                <InputField
                  label="Payment Terms (Days)"
                  type="number"
                  value={invoice.paymentTerms}
                  onChange={(value) =>
                    setInvoice({
                      ...invoice,
                      paymentTerms: value,
                    })
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Invoice Notes"
                    value={invoice.notes}
                    rows={3}
                    onChange={(value) =>
                      setInvoice({
                        ...invoice,
                        notes: value,
                      })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Terms & Conditions"
                    value={invoice.terms}
                    rows={5}
                    onChange={(value) =>
                      setInvoice({
                        ...invoice,
                        terms: value,
                      })
                    }
                  />
                </div>
              </div>

              <SaveButton onClick={saveInvoice} />
            </section>
          )}

          {/* QUOTATION */}

          {activeSection === "quotation" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Quotation Settings"
                description="Configure quotation numbering and validity."
                accent="blue"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Quotation Prefix"
                  value={quotation.prefix}
                  onChange={(value) =>
                    setQuotation({
                      ...quotation,
                      prefix: value,
                    })
                  }
                />

                <InputField
                  label="Next Quotation Number"
                  value={quotation.nextNumber}
                  onChange={(value) =>
                    setQuotation({
                      ...quotation,
                      nextNumber: value,
                    })
                  }
                />

                <InputField
                  label="Quotation Validity (Days)"
                  type="number"
                  value={quotation.validity}
                  onChange={(value) =>
                    setQuotation({
                      ...quotation,
                      validity: value,
                    })
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Quotation Notes"
                    value={quotation.notes}
                    rows={3}
                    onChange={(value) =>
                      setQuotation({
                        ...quotation,
                        notes: value,
                      })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Terms & Conditions"
                    value={quotation.terms}
                    rows={5}
                    onChange={(value) =>
                      setQuotation({
                        ...quotation,
                        terms: value,
                      })
                    }
                  />
                </div>
              </div>

              <SaveButton onClick={saveQuotation} />
            </section>
          )}

          {/* PAYMENT */}

          {activeSection === "payment" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Payment Settings"
                description="Manage available payment modes and defaults."
                accent="green"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Default Payment Mode
                </label>

                <select
                  value={payment.defaultMode}
                  onChange={(e) =>
                    setPayment({
                      ...payment,
                      defaultMode: e.target.value,
                    })
                  }
                  className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  {payment.modes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Modes
                </label>

                <div className="mb-4 flex flex-wrap gap-2">
                  {payment.modes.map((mode) => (
                    <div
                      key={mode}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {mode}
                      </span>

                      <button
                        type="button"
                        onClick={() => removePaymentMode(mode)}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700"
                        title={`Remove ${mode}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex w-full max-w-md gap-2">
                  <input
                    value={newPaymentMode}
                    onChange={(e) => setNewPaymentMode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addPaymentMode();
                      }
                    }}
                    placeholder="Add payment mode"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={addPaymentMode}
                    className="shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <SaveButton onClick={savePayment} />
            </section>
          )}

          {/* NOTIFICATIONS */}

          {activeSection === "notifications" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Reminder Settings"
                description="Control CRM reminder preferences."
                accent="orange"
              />

              <div className="space-y-3">
                <ToggleRow
                  title="Payment Reminders"
                  description="Enable reminders for pending invoice payments."
                  checked={notifications.paymentReminder}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      paymentReminder: checked,
                    })
                  }
                  accent="green"
                />

                <ToggleRow
                  title="Follow-up Reminders"
                  description="Enable reminders for scheduled follow-ups."
                  checked={notifications.followUpReminder}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      followUpReminder: checked,
                    })
                  }
                  accent="orange"
                />

                <ToggleRow
                  title="Renewal Reminders"
                  description="Enable reminders for upcoming renewals."
                  checked={notifications.renewalReminder}
                  onChange={(checked) =>
                    setNotifications({
                      ...notifications,
                      renewalReminder: checked,
                    })
                  }
                  accent="blue"
                />
              </div>

              <SaveButton onClick={saveNotifications} />
            </section>
          )}

          {/* PREFERENCES */}

          {activeSection === "preferences" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Preferences"
                description="Set your language, currency and date format."
                accent="blue"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField
                  label="Language"
                  value={preferences.language}
                  options={["English", "Hindi", "Marathi"]}
                  onChange={(value) =>
                    setPreferences({
                      ...preferences,
                      language: value,
                    })
                  }
                />

                <SelectField
                  label="Currency"
                  value={preferences.currency}
                  options={["INR", "USD", "EUR"]}
                  onChange={(value) =>
                    setPreferences({
                      ...preferences,
                      currency: value,
                    })
                  }
                />

                <SelectField
                  label="Date Format"
                  value={preferences.dateFormat}
                  options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]}
                  onChange={(value) =>
                    setPreferences({
                      ...preferences,
                      dateFormat: value,
                    })
                  }
                />
              </div>

              <SaveButton onClick={savePreferences} />
            </section>
          )}

          {/* ACTIVITY HISTORY */}

          {activeSection === "activity" && (
            <section className="p-4 sm:p-5 md:p-6">
              <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Activity History"
                  description="Track important CRM activities performed by logged-in users."
                  accent="blue"
                />

                <button
                  type="button"
                  onClick={refreshActivityLogs}
                  className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  ↻ Refresh
                </button>
              </div>

              {/* FILTERS */}

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search activity..."
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                <select
                  value={activityUserFilter}
                  onChange={(e) => setActivityUserFilter(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option>All Users</option>

                  {activityUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>

                <select
                  value={activityModuleFilter}
                  onChange={(e) => setActivityModuleFilter(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option>All Modules</option>

                  {activityModules.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </select>

                <select
                  value={activityActionFilter}
                  onChange={(e) => setActivityActionFilter(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option>All Actions</option>

                  {activityActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              {/* ACTIVITY HEADER */}

              <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    CRM Activity Log
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {filteredActivityLogs.length}{" "}
                    {filteredActivityLogs.length === 1
                      ? "activity"
                      : "activities"}{" "}
                    found.
                  </p>
                </div>

                {(activitySearch ||
                  activityUserFilter !== "All Users" ||
                  activityModuleFilter !== "All Modules" ||
                  activityActionFilter !== "All Actions") && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivitySearch("");
                      setActivityUserFilter("All Users");
                      setActivityModuleFilter("All Modules");
                      setActivityActionFilter("All Actions");
                    }}
                    className="w-fit text-xs font-semibold text-green-700 hover:text-green-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* TABLE */}

              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[950px] w-full text-sm">
                  <thead className="bg-[#F4F7FA]">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                        Date & Time
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                        User
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                        Activity
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                        Module
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700">
                        Record
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedActivityLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          <div className="text-2xl">🕘</div>

                          <div className="mt-2 font-medium text-slate-700">
                            No activity found
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            Activity will appear here when users perform CRM
                            actions.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedActivityLogs.map((log) => {
                        const user =
                          log.user_name || log.user_email || "Unknown User";

                        return (
                          <tr
                            key={log.id}
                            className="border-t border-slate-100 hover:bg-slate-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                              <div className="font-medium text-slate-700">
                                {new Date(log.created_at).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            </td>

                            <td className="max-w-[240px] px-4 py-3">
                              <div
                                className="truncate font-semibold text-slate-900"
                                title={user}
                              >
                                {user}
                              </div>

                              {log.user_email && (
                                <div
                                  className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400"
                                  title={log.user_email}
                                >
                                  {log.user_email}
                                </div>
                              )}
                            </td>

                            <td className="max-w-[360px] px-4 py-3">
                              <div
                                className="truncate font-medium text-slate-800"
                                title={log.description || log.action}
                              >
                                {log.description || log.action}
                              </div>

                              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {log.action}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                {log.module}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-700">
                                {log.record_id || "-"}
                              </div>

                              {log.record_name && (
                                <div
                                  className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400"
                                  title={log.record_name}
                                >
                                  {log.record_name}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ACTIVITY PAGINATION */}

              {filteredActivityLogs.length > 0 && (
                <div className="border-t border-slate-100">
                  <div className="flex min-w-0 flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-700">
                        {(activityCurrentPage - 1) * PAGE_SIZE + 1}-
                        {Math.min(
                          activityCurrentPage * PAGE_SIZE,
                          filteredActivityLogs.length,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-700">
                        {filteredActivityLogs.length}
                      </span>{" "}
                      activities
                    </p>

                    {activityTotalPages > 1 && (
                      <div className="flex max-w-full flex-wrap items-center justify-start gap-1 sm:justify-end">
                        <button
                          type="button"
                          disabled={activityCurrentPage === 1}
                          onClick={() =>
                            setActivityCurrentPage((page) =>
                              Math.max(1, page - 1),
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>

                        {activityPageNumbers.map((page, index) => {
                          const previousPage = activityPageNumbers[index - 1];

                          const showEllipsis =
                            previousPage !== undefined &&
                            page - previousPage > 1;

                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="px-1.5 text-xs text-slate-500">
                                  ...
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setActivityCurrentPage(page)}
                                className={`min-w-[32px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  activityCurrentPage === page
                                    ? "bg-blue-600 text-white"
                                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}

                        <button
                          type="button"
                          disabled={activityCurrentPage === activityTotalPages}
                          onClick={() =>
                            setActivityCurrentPage((page) =>
                              Math.min(activityTotalPages, page + 1),
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* DATA */}

          {activeSection === "data" && (
            <section className="p-4 sm:p-5 md:p-6">
              <SectionHeader
                title="Data & Backup"
                description="Tools for protecting and exporting CRM data."
                accent="orange"
              />

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    ⚠
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-amber-900">
                      Data safety
                    </h3>

                    <p className="mt-1 break-words text-sm leading-5 text-amber-700">
                      Your CRM currently stores data in browser local storage.
                      Full export and restore functionality should be
                      implemented before production use.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    ↓
                  </div>

                  <h3 className="font-semibold text-slate-900">Export Data</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Export CRM records for backup.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      window.alert(
                        "Full CRM export will be added in the next step.",
                      )
                    }
                    className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
                  >
                    Export Data
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    ↑
                  </div>

                  <h3 className="font-semibold text-slate-900">Restore Data</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Restore a previously exported CRM backup.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      window.alert(
                        "Restore functionality will be added in the next step.",
                      )
                    }
                    className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    Restore Backup
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function SectionHeader({
  title,
  description,
  accent = "green",
}: {
  title: string;
  description: string;
  accent?: "green" | "blue" | "orange" | "red";
}) {
  const accentClass = {
    green: "bg-green-600",
    blue: "bg-blue-500",
    orange: "bg-amber-500",
    red: "bg-red-500",
  }[accent];

  return (
    <div className="mb-5 min-w-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${accentClass}`} />

        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="mt-1 break-words text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full min-w-0 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  accent = "green",
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accent?: "green" | "blue" | "orange";
}) {
  const accentClasses = {
    green: {
      border: "border-green-200",
      bg: "bg-green-50/40",
      icon: "bg-green-50 text-green-600",
      switch: "bg-green-600",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50/30",
      icon: "bg-blue-50 text-blue-600",
      switch: "bg-blue-500",
    },
    orange: {
      border: "border-amber-200",
      bg: "bg-amber-50/30",
      icon: "bg-amber-50 text-amber-600",
      switch: "bg-amber-500",
    },
  }[accent];

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-4 rounded-xl border p-4 ${accentClasses.border} ${accentClasses.bg}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${accentClasses.icon}`}
        >
          ✓
        </div>

        <div className="min-w-0">
          <div className="font-semibold text-slate-900">{title}</div>

          <div className="mt-1 break-words text-sm text-slate-500">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? accentClasses.switch : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-end border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 sm:w-auto"
      >
        Save Changes
      </button>
    </div>
  );
}
