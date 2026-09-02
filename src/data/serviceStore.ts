export type ServiceStatus = "Active" | "Inactive";

export type ServiceCategory =
  | "Website"
  | "App"
  | "Digital Marketing"
  | "Domain & Hosting"
  | "AMC"
  | "Software"
  | "Other";

export type BillingType = "One Time" | "Monthly" | "Yearly" | "As Required";

export type GSTPercent = 0 | 5 | 12 | 18 | 28;

export type Service = {
  id: string;

  service_name: string;

  category: ServiceCategory | "";

  description: string;

  default_price: number;

  billing_type: BillingType;

  sac_code: string;

  gst_percent: GSTPercent;

  status: ServiceStatus;

  notes: string;

  createdAt: string;

  updatedAt?: string;

  /* Compatibility with existing pages */
  serviceName?: string;
  defaultPrice?: number;
  billingType?: BillingType;
  sacCode?: string;
  gstPercent?: GSTPercent;
};

const STORAGE_KEY = "crm-services";

/* =====================================================
   GET ALL SERVICES
===================================================== */

export function getServices(): Service[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Service[];
  } catch {
    return [];
  }
}

/* =====================================================
   SAVE SERVICES
===================================================== */

export function saveServices(services: Service[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

/* =====================================================
   GET SINGLE SERVICE
===================================================== */

export function getService(id: string): Service | null {
  const services = getServices();

  return services.find((service) => String(service.id) === String(id)) || null;
}

/* =====================================================
   GENERATE SERVICE ID
===================================================== */

export function generateServiceId(): string {
  const services = getServices();

  let maxNumber = 0;

  services.forEach((service) => {
    const match = String(service.id).match(/^SRV-(\d+)$/);

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (number > maxNumber) {
      maxNumber = number;
    }
  });

  return `SRV-${String(maxNumber + 1).padStart(3, "0")}`;
}

/* =====================================================
   ADD SERVICE
===================================================== */

export function addService(service: Service): Service {
  const services = getServices();

  const updated = [...services, service];

  saveServices(updated);

  return service;
}

/* =====================================================
   UPDATE SERVICE
===================================================== */

export function updateService(
  id: string,
  updates: Partial<Service>,
): Service | null {
  const services = getServices();

  let updatedService: Service | null = null;

  const updated = services.map((service) => {
    if (String(service.id) !== String(id)) {
      return service;
    }

    updatedService = {
      ...service,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return updatedService;
  });

  if (!updatedService) {
    return null;
  }

  saveServices(updated);

  return updatedService;
}

/* =====================================================
   DELETE SERVICE
===================================================== */

export function deleteService(id: string): boolean {
  const services = getServices();

  const exists = services.some((service) => String(service.id) === String(id));

  if (!exists) {
    return false;
  }

  const updated = services.filter(
    (service) => String(service.id) !== String(id),
  );

  saveServices(updated);

  return true;
}

/* =====================================================
   ACTIVATE SERVICE
===================================================== */

export function activateService(id: string): Service | null {
  return updateService(id, {
    status: "Active",
  });
}

/* =====================================================
   DEACTIVATE SERVICE
===================================================== */

export function deactivateService(id: string): Service | null {
  return updateService(id, {
    status: "Inactive",
  });
}
