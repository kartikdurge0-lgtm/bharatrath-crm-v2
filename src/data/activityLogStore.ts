import { supabase } from "../lib/supabase";

/* =========================================================
   ACTIVITY ACTIONS
========================================================= */

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
  | "FOLLOW_UP_COMPLETED"
  | string;

/* =========================================================
   ACTIVITY MODULES
========================================================= */

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
  | "System"
  | string;

/* =========================================================
   ACTIVITY LOG
========================================================= */

export interface ActivityLog {
  id: number;

  user_id: string | null;
  user_name: string | null;
  user_email: string | null;

  action: ActivityAction;
  module: ActivityModule;

  record_id: string | null;
  record_name: string | null;

  description: string | null;

  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;

  created_at: string;
}

/* =========================================================
   CREATE INPUT
========================================================= */

export interface CreateActivityLogInput {
  action: ActivityAction;
  module: ActivityModule;

  record_id?: string | null;
  record_name?: string | null;

  description?: string | null;

  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

/* =========================================================
   CREATE ACTIVITY LOG
========================================================= */

/**
 * Creates an activity log for the currently authenticated user.
 *
 * IMPORTANT:
 * - User identity always comes from Supabase Auth.
 * - Frontend never accepts user_id/user_name/user_email
 *   from the caller.
 * - Activity logs are append-only.
 * - Failure to create an activity log must NEVER break
 *   the actual CRM operation.
 */
export async function createActivityLog(
  input: CreateActivityLogInput,
): Promise<ActivityLog | null> {
  try {
    /* -------------------------------------------------------
       CURRENT AUTH USER
    ------------------------------------------------------- */

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn(
        "Activity log skipped: unable to read authenticated user.",
        userError,
      );

      return null;
    }

    if (!user) {
      console.warn("Activity log skipped: no authenticated user found.");

      return null;
    }

    /* -------------------------------------------------------
       USER DISPLAY INFORMATION
       We store these values in the activity row itself so
       Activity History does NOT depend on another user's
       profile being readable later.
    ------------------------------------------------------- */

    const metadata = user.user_metadata ?? {};

    const userName =
      String(
        metadata.full_name ?? metadata.name ?? metadata.display_name ?? "",
      ).trim() || null;

    const userEmail = String(user.email ?? "").trim() || null;

    /* -------------------------------------------------------
       INSERT
    ------------------------------------------------------- */

    const payload = {
      user_id: user.id,

      user_name: userName,
      user_email: userEmail,

      action: input.action,
      module: input.module,

      record_id: input.record_id ?? null,
      record_name: input.record_name ?? null,

      description: input.description ?? null,

      old_data: input.old_data ?? null,
      new_data: input.new_data ?? null,
    };

    const { data, error } = await supabase
      .from("activity_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create activity log:", error);

      return null;
    }

    return data as ActivityLog;
  } catch (error) {
    console.error("Unexpected activity log creation error:", error);
    return null;
  }
}

/* =========================================================
   GET ALL ACTIVITIES
========================================================= */

/**
 * Returns ALL activities visible to the current authenticated
 * user according to Supabase RLS.
 * RLS requirement:
 * authenticated users
 *      ↓
 * activity_logs SELECT
 *      ↓
 * USING (true)
 *
 * Therefore User A can see User B's activities.
 */
export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

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

/* =========================================================
   GET BY MODULE
========================================================= */

export async function getActivityLogsByModule(
  module: string,
): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("module", module)
      .order("created_at", {
        ascending: false,
      });

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

/* =========================================================
   GET BY USER
========================================================= */

export async function getActivityLogsByUser(
  userId: string,
): Promise<ActivityLog[]> {
  try {
    const normalizedUserId = String(userId).trim();

    if (!normalizedUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", normalizedUserId)
      .order("created_at", {
        ascending: false,
      });

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

/* =========================================================
   GET BY RECORD
========================================================= */

export async function getActivityLogsByRecord(
  module: string,
  recordId: string,
): Promise<ActivityLog[]> {
  try {
    const normalizedModule = String(module).trim();
    const normalizedRecordId = String(recordId).trim();

    if (!normalizedModule || !normalizedRecordId) {
      return [];
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("module", normalizedModule)
      .eq("record_id", normalizedRecordId)
      .order("created_at", {
        ascending: false,
      });

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

/* =========================================================
   GET BY ACTION
========================================================= */

export async function getActivityLogsByAction(
  action: string,
): Promise<ActivityLog[]> {
  try {
    const normalizedAction = String(action).trim();

    if (!normalizedAction) {
      return [];
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("action", normalizedAction)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Failed to load action activity logs:", error);

      return [];
    }

    return (data ?? []) as ActivityLog[];
  } catch (error) {
    console.error("Unexpected action activity error:", error);

    return [];
  }
}

/* =========================================================
   SEARCH ACTIVITIES
========================================================= */

/**
 * Server-side search is intentionally avoided here because
 * activity history contains multiple searchable fields and
 * the Settings page normally works with a manageable activity
 * dataset.
 *
 * Search is performed against already fetched activity rows.
 */
export function searchActivityLogs(
  activities: ActivityLog[],
  query: string,
): ActivityLog[] {
  const normalizedQuery = String(query).trim().toLowerCase();

  if (!normalizedQuery) {
    return [...activities];
  }

  return activities.filter((activity) => {
    const searchableText = [
      activity.user_name,
      activity.user_email,
      activity.action,
      activity.module,
      activity.record_id,
      activity.record_name,
      activity.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

/* =========================================================
   FILTER ACTIVITIES
========================================================= */

export interface ActivityFilterOptions {
  search?: string;
  userId?: string;
  module?: string;
  action?: string;
}

/**
 * Applies:
 *
 * SEARCH
 *   ↓
 * USER FILTER
 *   ↓
 * MODULE FILTER
 *   ↓
 * ACTION FILTER
 *   ↓
 * LATEST FIRST
 */
export function filterActivityLogs(
  activities: ActivityLog[],
  options: ActivityFilterOptions = {},
): ActivityLog[] {
  const search = String(options.search ?? "")
    .trim()
    .toLowerCase();

  const userId = String(options.userId ?? "").trim();

  const module = String(options.module ?? "").trim();

  const action = String(options.action ?? "").trim();

  const filtered = activities.filter((activity) => {
    /* -------------------------------------------------------
       SEARCH
    ------------------------------------------------------- */

    if (search) {
      const searchableText = [
        activity.user_name,
        activity.user_email,
        activity.action,
        activity.module,
        activity.record_id,
        activity.record_name,
        activity.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }

    /* -------------------------------------------------------
       USER
    ------------------------------------------------------- */

    if (userId && activity.user_id !== userId) {
      return false;
    }

    /* -------------------------------------------------------
       MODULE
    ------------------------------------------------------- */

    if (module && activity.module !== module) {
      return false;
    }

    /* -------------------------------------------------------
       ACTION
    ------------------------------------------------------- */

    if (action && activity.action !== action) {
      return false;
    }

    return true;
  });

  /* ---------------------------------------------------------
     ALWAYS LATEST FIRST
  --------------------------------------------------------- */

  return [...filtered].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();

    const validA = Number.isFinite(timeA);
    const validB = Number.isFinite(timeB);

    if (validA && validB && timeA !== timeB) {
      return timeB - timeA;
    }

    if (validA && !validB) {
      return -1;
    }

    if (!validA && validB) {
      return 1;
    }

    return Number(b.id || 0) - Number(a.id || 0);
  });
}

/* =========================================================
   GET DISTINCT USERS
========================================================= */

/**
 * Builds the user list directly from activity logs.
 *
 * IMPORTANT:
 * We DO NOT query profiles here.
 *
 * This means User A can see User B in the Activity History
 * user filter even when profiles RLS allows only:
 *
 * own profile OR admin
 */
export function getActivityUsers(activities: ActivityLog[]): {
  id: string;
  name: string;
  email: string;
}[] {
  const users = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
    }
  >();

  for (const activity of activities) {
    if (!activity.user_id) {
      continue;
    }

    if (users.has(activity.user_id)) {
      continue;
    }

    users.set(activity.user_id, {
      id: activity.user_id,
      name:
        activity.user_name?.trim() ||
        activity.user_email?.trim() ||
        "Unknown User",
      email: activity.user_email?.trim() || "",
    });
  }

  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* =========================================================
   GET DISTINCT MODULES
========================================================= */

export function getActivityModules(activities: ActivityLog[]): string[] {
  return [
    ...new Set(activities.map((activity) => activity.module).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

/* =========================================================
   GET DISTINCT ACTIONS
========================================================= */

export function getActivityActions(activities: ActivityLog[]): string[] {
  return [
    ...new Set(activities.map((activity) => activity.action).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

/* =========================================================
   ACTIVITY COUNT
========================================================= */

export function getActivityCount(activities: ActivityLog[]): number {
  return activities.length;
}

/* =========================================================
   ACTIVITY BY ID
========================================================= */

export function getActivityLogById(
  activities: ActivityLog[],
  id: number,
): ActivityLog | undefined {
  return activities.find((activity) => Number(activity.id) === Number(id));
}
