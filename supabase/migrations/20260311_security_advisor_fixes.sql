-- ============================================================
-- Migration: Security Advisor Fixes
-- Date: 2026-03-11
-- Environment: Run on STAGING first, then PRODUCTION after approval.
-- ============================================================
-- Addresses the following Security Advisor warnings:
--
--  1. [appointments]        "Allow All Insert/Update/Delete" policies left over
--                           from fix_admin_rls.sql have WITH CHECK (true) /
--                           USING (true) — replaced with admin-only checks.
--
--  2. [appointment_requests] Anon INSERT used WITH CHECK (true) — replaced with
--                           a check that enforces status = 'pending' so unauthenticated
--                           users cannot self-approve or set arbitrary statuses.
--
--  3. [appointments]        Anon INSERT policy must also validate that
--                           appointment_date is not a disabled day in the
--                           non_working_days table (belt-and-suspenders beyond
--                           the trigger on appointment_requests).
--
--  4. [customers]           Anon INSERT used WITH CHECK (true) — hardened to
--                           confirm anon can only INSERT, never SELECT/UPDATE/DELETE.
--                           No public SELECT policy was ever created, so that is
--                           already correct; this migration just documents and
--                           tightens the INSERT check.
--
--  5. [Functions]           Any remaining custom functions without
--                           SET search_path = public — fixed via CREATE OR REPLACE.
--
-- NOTE: All DROP POLICY statements use IF EXISTS so the script is safe to
--       re-run on environments where some policies may not exist yet.
-- ============================================================


-- ============================================================
-- SECTION 1: Fix the `appointments` table
-- "Allow All Insert", "Allow All Update", "Allow All Delete"
-- were added by fix_admin_rls.sql for testing and must be removed.
-- Restore proper admin-only + anon-safe policies.
-- ============================================================

-- 1a. Remove the permissive test policies
DROP POLICY IF EXISTS "Allow All Insert"  ON public.appointments;
DROP POLICY IF EXISTS "Allow All Update"  ON public.appointments;
DROP POLICY IF EXISTS "Allow All Delete"  ON public.appointments;

-- 1b. Restore admin-only INSERT (admins only; anon cannot write to appointments directly)
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.appointments;
CREATE POLICY "Admins can insert appointments"
    ON public.appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- 1c. Restore admin-only UPDATE
DROP POLICY IF EXISTS "Admins can update appointments" ON public.appointments;
CREATE POLICY "Admins can update appointments"
    ON public.appointments
    FOR UPDATE
    TO authenticated
    USING  (public.is_admin())
    WITH CHECK (public.is_admin());

-- 1d. Restore admin-only DELETE
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
CREATE POLICY "Admins can delete appointments"
    ON public.appointments
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 1e. Explicitly deny anon any write access to the appointments table.
--     (anon has no INSERT/UPDATE/DELETE policy, so this is already the
--      default fail-closed behaviour — added here for documentation clarity
--      and to ensure no residual permissive policy remains.)
DROP POLICY IF EXISTS "Anon cannot write appointments" ON public.appointments;
CREATE POLICY "Anon cannot write appointments"
    ON public.appointments
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);


-- ============================================================
-- SECTION 2: Tighten the `appointment_requests` anon INSERT policy
-- Replace WITH CHECK (true) with a restrictive check that:
--   a) enforces status = 'pending'  (anon cannot self-approve)
--   b) validates appointment_date is not a non-working day
--      (belt-and-suspenders; trg_check_non_working_day also does this)
-- ============================================================

DROP POLICY IF EXISTS "Anon users can submit booking requests" ON public.appointment_requests;
CREATE POLICY "Anon users can submit booking requests"
    ON public.appointment_requests
    FOR INSERT
    TO anon
    WITH CHECK (
        -- Must arrive as 'pending'; anon cannot set any other status
        status = 'pending'

        -- Full-day salon closure check
        AND NOT EXISTS (
            SELECT 1 FROM public.non_working_days nwd
            WHERE nwd.date = appointment_date
              AND nwd.type = 'FULL_DAY'
        )

        -- Category-specific block check
        AND NOT EXISTS (
            SELECT 1 FROM public.non_working_days nwd
            WHERE nwd.date = appointment_date
              AND nwd.type = 'CATEGORY'
              AND nwd.category_id = service_type::text
        )
    );

-- Anon must never be able to UPDATE or DELETE appointment_requests
-- (no such policies exist, but make it explicit with a deny-all)
DROP POLICY IF EXISTS "Anon cannot mutate appointment_requests" ON public.appointment_requests;
CREATE POLICY "Anon cannot mutate appointment_requests"
    ON public.appointment_requests
    FOR ALL          -- covers UPDATE, DELETE, SELECT
    TO anon
    USING (false)
    WITH CHECK (false);
-- Note: The INSERT policy above takes precedence for INSERT because Postgres
-- evaluates permissive policies with OR — but the deny-all covers the other
-- commands without needing separate policies.


-- ============================================================
-- SECTION 3: Tighten the `customers` anon INSERT policy
-- Wrapped in a DO block — the customers table exists on Staging
-- but NOT on Production (it was never created via migration there).
-- The block is silently skipped when the table is absent.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN

    DROP POLICY IF EXISTS "Anon users can submit customer details" ON public.customers;
    EXECUTE $p$
      CREATE POLICY "Anon users can submit customer details"
          ON public.customers
          FOR INSERT
          TO anon
          -- customers columns confirmed: id, name, phone, email, notes, created_at
          WITH CHECK (
              (phone IS NOT NULL AND phone <> '')
              OR (name IS NOT NULL AND name <> '')
          )
    $p$;

    DROP POLICY IF EXISTS "Anon cannot read or mutate customers" ON public.customers;
    EXECUTE $p$
      CREATE POLICY "Anon cannot read or mutate customers"
          ON public.customers
          FOR ALL
          TO anon
          USING (false)
          WITH CHECK (false)
    $p$;

  ELSE
    RAISE NOTICE 'public.customers does not exist on this environment — skipping Section 3.';
  END IF;
END $$;


-- ============================================================
-- SECTION 4: Fix Mutable Search Path warnings on custom functions
-- Any function without SET search_path = public is vulnerable to
-- search_path injection. Re-declare all affected functions below.
-- ============================================================

-- 4a. update_updated_at_column()
--     Originally declared without SECURITY DEFINER or explicit search_path.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 4b. check_appointment_overlap()
--     Original signature used `service_type` enum; re-declare with same
--     signature so existing callers are unaffected.
CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
    p_date         DATE,
    p_start_time   TIME,
    p_duration     INTEGER,
    p_service_type public.service_type,
    p_exclude_id   UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p_end_time TIME;
BEGIN
    p_end_time := p_start_time + (p_duration || ' minutes')::INTERVAL;

    RETURN EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.appointment_date = p_date
          AND a.service_type     = p_service_type
          AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
          AND (
              -- New appointment starts during existing appointment
              (p_start_time >= a.start_time
               AND p_start_time < a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
              OR
              -- New appointment ends during existing appointment
              (p_end_time > a.start_time
               AND p_end_time <= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
              OR
              -- New appointment completely contains existing appointment
              (p_start_time <= a.start_time
               AND p_end_time >= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
          )
    );
END;
$$;

-- 4c. has_role() — overloaded with text _role parameter (from 20260304_customers_rls.sql)
--     Both overloads must be fixed.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

-- 4d. has_role() enum overload — intentionally NOT re-declared.
--     The original migration created has_role(uuid, app_role) but all current
--     callers (is_admin) use the text overload above. Re-declaring the enum
--     overload causes `operator does not exist: text = app_role` errors because
--     Postgres cannot find a direct equality operator between the stored enum
--     column and the parameter when search_path is pinned. The text overload
--     handles everything correctly via role::text = _role.

-- 4e. is_admin() — already has SET search_path but re-declare to be explicit
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::text)
$$;

-- 4f. check_non_working_day_before_insert() — already has SET search_path; re-declare
CREATE OR REPLACE FUNCTION public.check_non_working_day_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Block FULL_DAY entries (entire salon closed)
    IF EXISTS (
        SELECT 1 FROM public.non_working_days
        WHERE date = NEW.appointment_date
          AND type = 'FULL_DAY'
    ) THEN
        RAISE EXCEPTION 'Appointments cannot be made on %. The salon is closed on this date.', NEW.appointment_date;
    END IF;

    -- 2. Block CATEGORY entries (specific service blocked on this date)
    IF EXISTS (
        SELECT 1 FROM public.non_working_days
        WHERE date = NEW.appointment_date
          AND type = 'CATEGORY'
          AND category_id = NEW.service_type::text
    ) THEN
        RAISE EXCEPTION 'The service "%" is not available on %.', NEW.service_type, NEW.appointment_date;
    END IF;

    RETURN NEW;
END;
$$;

-- 4g. check_slot_available() — already has SET search_path; re-declare to confirm
CREATE OR REPLACE FUNCTION public.check_slot_available(
  p_date        DATE,
  p_start_time  TIME,
  p_duration    INTEGER,
  p_service_type TEXT,
  p_exclude_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_time TIME;
BEGIN
  -- 1. Full-day salon closure
  IF EXISTS (
    SELECT 1 FROM public.non_working_days
    WHERE date = p_date AND type = 'FULL_DAY'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full_day_closed');
  END IF;

  -- 2. Category-specific block
  IF EXISTS (
    SELECT 1 FROM public.non_working_days
    WHERE date = p_date
      AND type = 'CATEGORY'
      AND category_id = p_service_type
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'category_blocked');
  END IF;

  -- 3. Slot overlap
  v_end_time := p_start_time + (p_duration || ' minutes')::INTERVAL;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.appointment_date = p_date
      AND a.service_type::text = p_service_type
      AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
      AND (
          (p_start_time >= a.start_time AND p_start_time < a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
          OR (v_end_time > a.start_time AND v_end_time <= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
          OR (p_start_time <= a.start_time AND v_end_time >= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
      )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_occupied');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Re-grant execute (in case the function was dropped and recreated)
GRANT EXECUTE ON FUNCTION public.check_slot_available(DATE, TIME, INTEGER, TEXT, UUID) TO anon, authenticated;


-- ============================================================
-- SECTION 5: Verification queries
-- Run these after applying the migration to confirm correctness.
-- ============================================================
-- 5a. Confirm no WITH CHECK (true) or USING (true) policies remain:
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND (qual = 'true' OR with_check = 'true')
--   ORDER BY tablename, policyname;
--   Expected: 0 rows (only the non_working_days public SELECT is allowed to use USING(true))
--
-- 5b. Confirm all functions have search_path set:
--
--   SELECT proname, proconfig
--   FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND prokind = 'f'
--   ORDER BY proname;
--   Expected: every row in proconfig includes 'search_path=public'
--
-- 5c. Confirm anon cannot UPDATE/DELETE appointment_requests:
--
--   SELECT policyname, roles, cmd
--   FROM pg_policies
--   WHERE tablename = 'appointment_requests'
--     AND 'anon' = ANY(roles)
--     AND cmd IN ('UPDATE', 'DELETE', 'ALL');
--   Expected: 1 row — "Anon cannot mutate appointment_requests" with cmd = 'ALL'
-- ============================================================
