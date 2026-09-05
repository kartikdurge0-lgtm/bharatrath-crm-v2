import { supabase } from "../lib/supabase";

export type ActivityAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ARCHIVE"
  | "LOGIN"
  | "LOGOUT"
  | "STATUS_CHANGED"
  | "PAYMENT_ADDED"
  | "PAYMENT_CANCELLED"
  | "INVOICE_CREATED"
  | "INVOICE_SENT"
  | "FOLLOW_UP_COMPLETED";

export type ActivityModule =
  | "Leads"
  | "Clients"
  | "Sales Persons"
  | "Follow-ups"
  | "Quotations"
  | "Invoices"
  | "Payments"
  | "Renewals"
  | "Services"
  | "Settings"
  | "System";

export interface ActivityLog {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;

  action: ActivityAction | string;
  module: ActivityModule | string;

  record_id: string | null;
  record_name: string | null;

  description: string | null;

  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;

  created_at: string;
}

export interface CreateActivityLogInput {
  action: ActivityAction | string;
  module: ActivityModule | string;
  record_id?: string | null;
  record_name?: string | null;
  description?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

/**
 * Create an activity log.
 *
 * IMPORTANT:
 * User identity is NOT taken from the frontend.
 * Supabase trigger automatically assigns:
 * - user_id
 * - user_name
 * - user_email
 * based on the currently logged-in auth user.
 */
export async function createActivityLog(
  input: CreateActivityLogInput,
): Promise<ActivityLog | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("Activity log skipped: user is not authenticated.");
      return null;
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        // Only authenticated user's ID is sent.
        // Database trigger validates/sets this again.
        user_id: user.id,

        action: input.action,
        module: input.module,
        record_id: input.record_id ?? null,
        record_name: input.record_name ?? null,
        description: input.description ?? null,
        old_data: input.old_data ?? null,
        new_data: input.new_data ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create activity log:", error);
      return null;
    }

    return data as ActivityLog;
  } catch (error) {
    console.error("Unexpected activity log error:", error);
    return null;
  }
}

/**
 * Get all activity logs.
 *
 * Admin users can read activity history according to RLS.
 */
export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load activity logs:", error);
      return [];
    }

    return (data ?? []) as ActivityLog[];
  } catch (error) {
    console.error("Unexpected activity history error:", error);
    return [];
  }
}

/**
 * Get activity logs for a specific module.
 */
export async function getActivityLogsByModule(
  module: string,
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("module", module)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load module activity logs:", error);
      return [];
    }

    return (data ?? []) as ActivityLog[];
  } catch (error) {
    console.error("Unexpected module activity error:", error);
    return [];
  }
}

/**
 * Get activity logs for a specific record.
 *
 * Example:
 * getActivityLogsByRecord("Invoices", "INV-001")
 */
export async function getActivityLogsByRecord(
  module: string,
  recordId: string,
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("module", module)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load record activity logs:", error);
      return [];
    }

    return (data ?? []) as ActivityLog[];
  } catch (error) {
    console.error("Unexpected record activity error:", error);
    return [];
  }
}

/**
 * Get activity logs created by a specific user.
 */
export async function getActivityLogsByUser(
  userId: string,
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load user activity logs:", error);
      return [];
    }

    return (data ?? []) as ActivityLog[];
  } catch (error) {
    console.error("Unexpected user activity error:", error);
    return [];
  }
}
