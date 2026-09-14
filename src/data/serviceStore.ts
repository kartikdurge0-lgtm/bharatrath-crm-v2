import { supabase } from "../lib/supabase";
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

function getServiceStatus(service: Service): ServiceStatus {
  return service.status || "Active";
}

function mapDbService(row: any): Service {
  return {
    id: String(row.service_code || `SRV-${String(row.id).padStart(3, "0")}`),

    service_name: String(row.name ?? ""),

    category: (row.category ?? "") as ServiceCategory,

    description: String(row.description ?? ""),

    default_price: Number(row.default_price ?? 0),

    billing_type: (row.billing_type ?? "One Time") as BillingType,

    sac_code: String(row.sac_code ?? ""),

    gst_percent: Number(row.gst_percent ?? 18) as GSTPercent,

    status: row.is_active === false ? "Inactive" : "Active",

    notes: String(row.notes ?? ""),

    createdAt: String(row.created_at ?? new Date().toISOString()),

    updatedAt: row.updated_at ? String(row.updated_at) : undefined,

    /* Compatibility */
    serviceName: String(row.name ?? ""),
    defaultPrice: Number(row.default_price ?? 0),
    billingType: (row.billing_type ?? "One Time") as BillingType,
    sacCode: String(row.sac_code ?? ""),
    gstPercent: Number(row.gst_percent ?? 18) as GSTPercent,
  };
}

/* =====================================================
   GET ALL SERVICES
   Supabase = Source of Truth
===================================================== */

export async function getServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load services:", error);
      return [];
    }

    return (data ?? []).map(mapDbService);
  } catch (error) {
    console.error("Unexpected services loading error:", error);
    return [];
  }
}

/* =====================================================
   SAVE SERVICES
   Compatibility only.

   Services are now managed directly through Supabase.
   Do not use this function for normal CRUD.
===================================================== */

export async function saveServices(services: Service[]): Promise<void> {
  /*
   * Intentionally left as a compatibility helper.
   *
   * The CRM should use:
   * addService()
   * updateService()
   * deleteService()
   * activateService()
   * deactivateService()
   *
   * directly against Supabase.
   */

  void services;
}

/* =====================================================
   GET SINGLE SERVICE
===================================================== */

export async function getService(id: string): Promise<Service | null> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .or(`service_code.eq.${id},id.eq.${Number(id)}`)
      .maybeSingle();

    if (error) {
      console.error("Failed to load service:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapDbService(data);
  } catch (error) {
    console.error("Unexpected service loading error:", error);
    return null;
  }
}

/* =====================================================
   GENERATE SERVICE ID
===================================================== */

export async function generateServiceId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("service_code");

    if (error) {
      console.error("Failed to generate service ID:", error);
      return "SRV-001";
    }

    let maxNumber = 0;

    (data ?? []).forEach((row) => {
      const match = String(row.service_code ?? "").match(/^SRV-(\d+)$/);

      if (!match) {
        return;
      }

      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    });

    return `SRV-${String(maxNumber + 1).padStart(3, "0")}`;
  } catch (error) {
    console.error("Unexpected service ID generation error:", error);
    return "SRV-001";
  }
}

/* =====================================================
   ADD SERVICE
===================================================== */

export async function addService(service: Service): Promise<Service | null> {
  try {
    const serviceCode = service.id || (await generateServiceId());

    const { data, error } = await supabase
      .from("services")
      .insert({
        service_code: serviceCode,
        name: getServiceName(service),
        category: service.category || null,
        description: service.description || null,
        default_price: getServicePrice(service),
        billing_type: getServiceBillingType(service),
        sac_code: getServiceSacCode(service) || null,
        gst_percent: getServiceGstPercent(service),
        is_active: getServiceStatus(service) === "Active",
        notes: service.notes || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to add service:", error);
      throw error;
    }

    const newService = mapDbService(data);

    void createActivityLog({
      action: "CREATE",
      module: "Services",
      record_id: newService.id,
      record_name: getServiceName(newService),
      description: `Service "${getServiceName(newService)}" created.`,
      new_data: newService as unknown as Record<string, unknown>,
    });

    return newService;
  } catch (error) {
    console.error("Unexpected add service error:", error);
    throw error;
  }
}

/* =====================================================
   UPDATE SERVICE
===================================================== */

export async function updateService(
  id: string,
  updates: Partial<Service>,
): Promise<Service | null> {
  try {
    const existingService = await getService(id);

    if (!existingService) {
      return null;
    }

    const dbUpdates: Record<string, unknown> = {};

    if (
      updates.service_name !== undefined ||
      updates.serviceName !== undefined
    ) {
      dbUpdates.name = getServiceName({
        ...existingService,
        ...updates,
      });
    }

    if (updates.category !== undefined) {
      dbUpdates.category = updates.category || null;
    }

    if (updates.description !== undefined) {
      dbUpdates.description = updates.description || null;
    }

    if (
      updates.default_price !== undefined ||
      updates.defaultPrice !== undefined
    ) {
      dbUpdates.default_price = getServicePrice({
        ...existingService,
        ...updates,
      });
    }

    if (
      updates.billing_type !== undefined ||
      updates.billingType !== undefined
    ) {
      dbUpdates.billing_type = getServiceBillingType({
        ...existingService,
        ...updates,
      });
    }

    if (updates.sac_code !== undefined || updates.sacCode !== undefined) {
      dbUpdates.sac_code =
        getServiceSacCode({
          ...existingService,
          ...updates,
        }) || null;
    }

    if (updates.gst_percent !== undefined || updates.gstPercent !== undefined) {
      dbUpdates.gst_percent = getServiceGstPercent({
        ...existingService,
        ...updates,
      });
    }

    if (updates.status !== undefined) {
      dbUpdates.is_active =
        getServiceStatus({
          ...existingService,
          ...updates,
        }) === "Active";
    }

    if (updates.notes !== undefined) {
      dbUpdates.notes = updates.notes || null;
    }

    const { data, error } = await supabase
      .from("services")
      .update(dbUpdates)
      .eq("service_code", existingService.id)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update service:", error);
      throw error;
    }

    const updatedService = mapDbService(data);

    if (existingService.status !== updatedService.status) {
      void createActivityLog({
        action:
          updatedService.status === "Active" ? "ACTIVATED" : "DEACTIVATED",
        module: "Services",
        record_id: updatedService.id,
        record_name: getServiceName(updatedService),
        description: `Service "${getServiceName(updatedService)}" status changed from "${existingService.status}" to "${updatedService.status}".`,
        old_data: existingService as unknown as Record<string, unknown>,
        new_data: updatedService as unknown as Record<string, unknown>,
      });
    } else {
      void createActivityLog({
        action: "UPDATE",
        module: "Services",
        record_id: updatedService.id,
        record_name: getServiceName(updatedService),
        description: `Service "${getServiceName(updatedService)}" updated.`,
        old_data: existingService as unknown as Record<string, unknown>,
        new_data: updatedService as unknown as Record<string, unknown>,
      });
    }

    return updatedService;
  } catch (error) {
    console.error("Unexpected update service error:", error);
    throw error;
  }
}

/* =====================================================
   DELETE / ARCHIVE SERVICE
   Soft archive only
===================================================== */

export async function deleteService(id: string): Promise<boolean> {
  try {
    const existingService = await getService(id);

    if (!existingService) {
      return false;
    }

    const { error } = await supabase
      .from("services")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("service_code", existingService.id);

    if (error) {
      console.error("Failed to archive service:", error);
      throw error;
    }

    void createActivityLog({
      action: "ARCHIVE",
      module: "Services",
      record_id: existingService.id,
      record_name: getServiceName(existingService),
      description: `Service "${getServiceName(existingService)}" archived.`,
      old_data: existingService as unknown as Record<string, unknown>,
      new_data: {
        ...existingService,
        status: "Inactive",
      } as unknown as Record<string, unknown>,
    });

    return true;
  } catch (error) {
    console.error("Unexpected archive service error:", error);
    throw error;
  }
}

/* =====================================================
   ACTIVATE SERVICE
===================================================== */

export async function activateService(id: string): Promise<Service | null> {
  return updateService(id, {
    status: "Active",
  });
}

/* =====================================================
   DEACTIVATE SERVICE
===================================================== */

export async function deactivateService(id: string): Promise<Service | null> {
  return updateService(id, {
    status: "Inactive",
  });
}

/* =====================================================
   COMPATIBILITY HELPERS
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
