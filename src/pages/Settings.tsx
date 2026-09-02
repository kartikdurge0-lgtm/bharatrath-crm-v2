import { useState } from "react";

import {
  getActiveSalesPersons,
  addSalesPerson,
  updateSalesPerson,
  deactivateSalesPerson,
  deleteSalesPerson,
  generateSalesPersonId,
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
  | "data";

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

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>(() =>
    getActiveSalesPersons(),
  );

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

  const showSaved = (text = "Settings saved successfully.") => {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };

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

  const refreshSalesPersons = () => {
    setSalesPersons(getActiveSalesPersons());
  };

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

  const saveSalesPerson = () => {
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

    if (editingSalesPersonId) {
      updateSalesPerson(editingSalesPersonId, {
        name,
        mobile: salesPersonForm.mobile.trim(),
        email: salesPersonForm.email.trim(),
        type: salesPersonForm.type,
        commissionPercent: commission,
        notes: salesPersonForm.notes.trim(),
      });

      refreshSalesPersons();
      resetSalesPersonForm();
      showSaved("Sales Person updated successfully.");
      return;
    }

    addSalesPerson({
      id: generateSalesPersonId(),
      name,
      mobile: salesPersonForm.mobile.trim(),
      email: salesPersonForm.email.trim(),
      type: salesPersonForm.type,
      commissionPercent: commission,
      status: "Active",
      notes: salesPersonForm.notes.trim(),
      createdAt: new Date().toISOString(),
    });

    refreshSalesPersons();
    resetSalesPersonForm();
    showSaved("Sales Person added successfully.");
  };

  const handleDeactivate = (person: SalesPerson) => {
    const confirmed = window.confirm(
      `Deactivate ${person.name}? They will no longer appear in new Lead / Quotation selections.`,
    );

    if (!confirmed) return;

    deactivateSalesPerson(person.id);
    refreshSalesPersons();

    showSaved("Sales Person deactivated.");
  };

  const handleDelete = (person: SalesPerson) => {
    const confirmed = window.confirm(
      `Delete ${person.name}? This should only be used if the person was added by mistake.`,
    );

    if (!confirmed) return;

    deleteSalesPerson(person.id);
    refreshSalesPersons();

    showSaved("Sales Person deleted.");
  };

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
      key: "data",
      label: "Data & Backup",
      icon: "💾",
      description: "Data export and backup tools",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* PAGE HEADER */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your Bharatrath CRM settings
        </p>
      </div>

      {/* SUCCESS / ERROR MESSAGE */}
      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ {message}
        </div>
      )}

      {/* MAIN SETTINGS LAYOUT */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* LEFT NAVIGATION */}
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="mb-2 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Settings
            </div>
          </div>

          {sections.map((section) => {
            const active = activeSection === section.key;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-green-50 text-green-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-start gap-3">
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
                    <div className="text-sm font-semibold">{section.label}</div>

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
        </aside>

        {/* RIGHT CONTENT */}
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* BUSINESS PROFILE */}
          {activeSection === "business" && (
            <section className="p-5 md:p-6">
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
            <section className="p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Team & Sales Persons"
                  description="Manage internal team members and external referral / sales persons."
                  accent="blue"
                />

                <button
                  type="button"
                  onClick={openAddSalesPerson}
                  className="shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                >
                  + Add Sales Person
                </button>
              </div>

              {/* SALES PERSON FORM */}
              {showSalesPersonForm && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50/60 p-5">
                  <div className="mb-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        👤
                      </span>

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {editingSalesPersonId
                            ? "Edit Sales Person"
                            : "Add Sales Person"}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
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

                  <div className="mt-5 flex flex-wrap gap-2">
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

              {/* ACTIVE SALES PERSONS */}
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Active Sales Persons
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      These persons appear in Lead and Quotation selections.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    {salesPersons.length} Active
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#F4F7FA]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Name
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Type
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Mobile
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Commission
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
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
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">
                                {person.name}
                              </div>

                              {person.email && (
                                <div className="mt-0.5 text-xs text-slate-400">
                                  {person.email}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {person.type}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {person.mobile || "-"}
                            </td>

                            <td className="px-4 py-3 font-medium text-slate-700">
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

                                <button
                                  type="button"
                                  onClick={() => handleDelete(person)}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Delete
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
            <section className="p-5 md:p-6">
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
            <section className="p-5 md:p-6">
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
            <section className="p-5 md:p-6">
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

                <div className="flex max-w-md gap-2">
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
                    className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
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
            <section className="p-5 md:p-6">
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
            <section className="p-5 md:p-6">
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

          {/* DATA */}
          {activeSection === "data" && (
            <section className="p-5 md:p-6">
              <SectionHeader
                title="Data & Backup"
                description="Tools for protecting and exporting CRM data."
                accent="orange"
              />

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    ⚠
                  </div>

                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Data safety
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-amber-700">
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
                    className="mt-4 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
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
                    className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
    <div className="mb-5">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${accentClass}`} />

        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">{description}</p>
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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${accentClasses.border} ${accentClasses.bg}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${accentClasses.icon}`}
        >
          ✓
        </div>

        <div>
          <div className="font-semibold text-slate-900">{title}</div>

          <div className="mt-1 text-sm text-slate-500">{description}</div>
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
        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
      >
        Save Changes
      </button>
    </div>
  );
}
