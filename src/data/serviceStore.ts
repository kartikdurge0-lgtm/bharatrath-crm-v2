import { createActivityLog } from "./activityLogStore";

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
   HELPERS
===================================================== */

function getServiceName(service: Service): string {
  return service.service_name || service.serviceName || "";
}

function getServicePrice(service: Service): number {
  return Number(service.default_price ?? service.defaultPrice ?? 0);
}

function getServiceBillingType(service: Service): BillingType {
  return service.billing_type || service.billingType || "One Time";
}

function getServiceSacCode(service: Service): string {
  return service.sac_code || service.sacCode || "";
}

function getServiceGstPercent(service: Service): GSTPercent {
  return service.gst_percent ?? service.gstPercent ?? 18;
}

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

  void createActivityLog({
    action: "CREATE",
    module: "Service",
    record_id: service.id,
    record_name: getServiceName(service),
    description: `Service "${getServiceName(service)}" created.`,
    new_data: service,
  });

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

  const existingService = services.find(
    (service) => String(service.id) === String(id),
  );

  if (!existingService) {
    return null;
  }

  const updatedService: Service = {
    ...existingService,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const updated = services.map((service) =>
    String(service.id) === String(id) ? updatedService : service,
  );

  saveServices(updated);

  void createActivityLog({
    action: "UPDATE",
    module: "Service",
    record_id: updatedService.id,
    record_name: getServiceName(updatedService),
    description: `Service "${getServiceName(updatedService)}" updated.`,
    old_data: existingService,
    new_data: updatedService,
  });

  return updatedService;
}

/* =====================================================
   DELETE / ARCHIVE SERVICE
   NOTE:
   Services are never permanently deleted.
===================================================== */

export function deleteService(id: string): boolean {
  const services = getServices();

  const existingService = services.find(
    (service) => String(service.id) === String(id),
  );

  if (!existingService) {
    return false;
  }

  const updatedService: Service = {
    ...existingService,
    status: "Inactive",
    updatedAt: new Date().toISOString(),
  };

  const updated = services.map((service) =>
    String(service.id) === String(id) ? updatedService : service,
  );

  saveServices(updated);

  void createActivityLog({
    action: "ARCHIVE",
    module: "Service",
    record_id: updatedService.id,
    record_name: getServiceName(updatedService),
    description: `Service "${getServiceName(updatedService)}" archived.`,
    old_data: existingService,
    new_data: updatedService,
  });

  return true;
}

/* =====================================================
   ACTIVATE SERVICE
===================================================== */

export function activateService(id: string): Service | null {
  const services = getServices();

  const existingService = services.find(
    (service) => String(service.id) === String(id),
  );

  if (!existingService) {
    return null;
  }

  const updatedService: Service = {
    ...existingService,
    status: "Active",
    updatedAt: new Date().toISOString(),
  };

  const updated = services.map((service) =>
    String(service.id) === String(id) ? updatedService : service,
  );

  saveServices(updated);

  void createActivityLog({
    action: "ACTIVATED",
    module: "Service",
    record_id: updatedService.id,
    record_name: getServiceName(updatedService),
    description: `Service "${getServiceName(updatedService)}" activated.`,
    old_data: existingService,
    new_data: updatedService,
  });

  return updatedService;
}

/* =====================================================
   DEACTIVATE SERVICE
===================================================== */

export function deactivateService(id: string): Service | null {
  const services = getServices();

  const existingService = services.find(
    (service) => String(service.id) === String(id),
  );

  if (!existingService) {
    return null;
  }

  const updatedService: Service = {
    ...existingService,
    status: "Inactive",
    updatedAt: new Date().toISOString(),
  };

  const updated = services.map((service) =>
    String(service.id) === String(id) ? updatedService : service,
  );

  saveServices(updated);

  void createActivityLog({
    action: "DEACTIVATED",
    module: "Service",
    record_id: updatedService.id,
    record_name: getServiceName(updatedService),
    description: `Service "${getServiceName(updatedService)}" deactivated.`,
    old_data: existingService,
    new_data: updatedService,
  });

  return updatedService;
}

/* =====================================================
   COMPATIBILITY HELPERS
   Useful for quotation / invoice pages
===================================================== */

export function getServiceDisplayName(service: Service): string {
  return getServiceName(service);
}

export function getServiceDefaultPrice(service: Service): number {
  return getServicePrice(service);
}

export function getServiceBilling(service: Service): BillingType {
  return getServiceBillingType(service);
}

export function getServiceSAC(service: Service): string {
  return getServiceSacCode(service);
}

export function getServiceGST(service: Service): GSTPercent {
  return getServiceGstPercent(service);
}
