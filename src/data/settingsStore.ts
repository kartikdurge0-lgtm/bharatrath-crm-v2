export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  gstin: string;
  website: string;
  address: string;
  logo: string;
};

export type InvoiceSettings = {
  prefix: string;
  nextNumber: number;

  // Renewal invoices have their own numbering sequence
  nextRenewalNumber: number;

  defaultGst: number;
  paymentTerms: number;
  notes: string;
  terms: string;
};

const BUSINESS_STORAGE_KEY = "crm-business-profile";
const INVOICE_STORAGE_KEY = "crm-settings-invoice";

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "Bharatrath",
  ownerName: "",
  phone: "",
  email: "",
  gstin: "",
  website: "",
  address: "",
  logo: "",
};

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  prefix: "BDP-",
  nextNumber: 1,

  // Renewal invoice serial starts from 001
  nextRenewalNumber: 1,

  defaultGst: 18,
  paymentTerms: 15,
  notes: "",
  terms: "",
};

export function getBusinessProfile(): BusinessProfile {
  const saved = localStorage.getItem(BUSINESS_STORAGE_KEY);

  if (!saved) {
    return DEFAULT_PROFILE;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_PROFILE;
    }

    return {
      ...DEFAULT_PROFILE,
      ...(parsed as Partial<BusinessProfile>),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveBusinessProfile(profile: BusinessProfile): BusinessProfile {
  localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(profile));

  return profile;
}

export function getInvoiceSettings(): InvoiceSettings {
  const saved = localStorage.getItem(INVOICE_STORAGE_KEY);

  if (!saved) {
    return DEFAULT_INVOICE_SETTINGS;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_INVOICE_SETTINGS;
    }

    const data = parsed as Partial<InvoiceSettings>;

    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...data,

      nextNumber: Number(data.nextNumber) || 1,

      nextRenewalNumber: Number(data.nextRenewalNumber) || 1,

      defaultGst: Number(data.defaultGst) || 0,

      paymentTerms: Number(data.paymentTerms) || 0,
    };
  } catch {
    return DEFAULT_INVOICE_SETTINGS;
  }
}

export function saveInvoiceSettings(
  settings: InvoiceSettings,
): InvoiceSettings {
  localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(settings));

  return settings;
}

export function updateNextInvoiceNumber(nextNumber: number): void {
  const settings = getInvoiceSettings();

  saveInvoiceSettings({
    ...settings,
    nextNumber,
  });
}

export function updateNextRenewalInvoiceNumber(nextNumber: number): void {
  const settings = getInvoiceSettings();

  saveInvoiceSettings({
    ...settings,
    nextRenewalNumber: nextNumber,
  });
}
