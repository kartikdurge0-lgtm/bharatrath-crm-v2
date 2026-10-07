-- ============================================================
-- Bharatrath CRM
-- DEV → PROD schema alignment
-- Date: 2026-10-07
--
-- This migration captures confirmed DEV changes that are
-- missing from the original remote schema migration.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CLIENTS
-- ============================================================

-- Accidental/unused column confirmed empty in DEV.
ALTER TABLE public.clients
DROP COLUMN IF EXISTS "Name: crm_client_id";

-- Stable CRM Client ID uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS clients_crm_client_id_unique
ON public.clients (crm_client_id)
WHERE crm_client_id IS NOT NULL;


-- ============================================================
-- 2. PAYMENTS
-- ============================================================

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_proof text;


-- ============================================================
-- 3. RENEWALS
-- ============================================================

-- is_archived and completed_at already exist in the original
-- migration, so do not recreate them.

ALTER TABLE public.renewals
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.renewals
ADD COLUMN IF NOT EXISTS payment_status text
DEFAULT 'Pending';

ALTER TABLE public.renewals
ADD COLUMN IF NOT EXISTS reminder_days integer
DEFAULT 7;

-- Make DEV defaults explicit for existing/new rows.
ALTER TABLE public.renewals
ALTER COLUMN payment_status SET DEFAULT 'Pending';

ALTER TABLE public.renewals
ALTER COLUMN reminder_days SET DEFAULT 7;

CREATE INDEX IF NOT EXISTS idx_renewals_archived
ON public.renewals (is_archived);

CREATE INDEX IF NOT EXISTS idx_renewals_is_archived
ON public.renewals (is_archived);

CREATE INDEX IF NOT EXISTS idx_renewals_payment_status
ON public.renewals (payment_status);

CREATE INDEX IF NOT EXISTS idx_renewals_reminder_days
ON public.renewals (reminder_days);


-- ============================================================
-- 4. QUOTATIONS
-- ============================================================

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS grand_total numeric DEFAULT 0;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS is_archived boolean
DEFAULT false;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS service_name text;

ALTER TABLE public.quotations
ALTER COLUMN is_archived SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quotations_is_archived
ON public.quotations (is_archived);


-- ============================================================
-- 5. ACTIVITY LOG RLS
-- ============================================================

-- DEV final requirement:
-- All authenticated users can view activity logs.
-- Only authenticated users can create their own activity log.
DROP POLICY IF EXISTS "Admins can view activity logs"
ON public.activity_logs;

DROP POLICY IF EXISTS "activity_logs_select_authenticated"
ON public.activity_logs;

DROP POLICY IF EXISTS "Authenticated users can create activity logs"
ON public.activity_logs;

DROP POLICY IF EXISTS "activity_logs_insert_authenticated"
ON public.activity_logs;

CREATE POLICY "activity_logs_select_authenticated"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "activity_logs_insert_authenticated"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 6. CLIENTS RLS
-- ============================================================

DROP POLICY IF EXISTS "clients_insert_authenticated"
ON public.clients;

DROP POLICY IF EXISTS "clients_select_authenticated"
ON public.clients;

DROP POLICY IF EXISTS "clients_update_authenticated"
ON public.clients;

CREATE POLICY "clients_insert_authenticated"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_select_authenticated"
ON public.clients
FOR SELECT
TO authenticated
USING (
  is_archived = false
  OR public.is_admin()
);

CREATE POLICY "clients_update_authenticated"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  is_archived = false
  OR public.is_admin()
)
WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================
-- 7. SERVICES
-- ============================================================

DROP POLICY IF EXISTS "services_select_authenticated"
ON public.services;

DROP POLICY IF EXISTS "services_insert_admin"
ON public.services;

DROP POLICY IF EXISTS "services_update_admin"
ON public.services;

CREATE POLICY "services_select_authenticated"
ON public.services
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "services_insert_admin"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "services_update_admin"
ON public.services
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================================
-- 8. SALES PERSONS
-- ============================================================

DROP POLICY IF EXISTS "sales_persons_select_authenticated"
ON public.sales_persons;

DROP POLICY IF EXISTS "sales_persons_insert_admin"
ON public.sales_persons;

DROP POLICY IF EXISTS "sales_persons_update_admin"
ON public.sales_persons;

CREATE POLICY "sales_persons_select_authenticated"
ON public.sales_persons
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sales_persons_insert_admin"
ON public.sales_persons
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "sales_persons_update_admin"
ON public.sales_persons
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================================
-- 9. PROFILES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_authenticated"
ON public.profiles;

DROP POLICY IF EXISTS "profiles_update_admin"
ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY "profiles_update_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ============================================================
-- 10. ENSURE RLS
-- ============================================================

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 11. REFRESH POSTGREST SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;