-- ============================================================
-- Migration: Enable Row Level Security on public.customers
-- Date: 2026-03-04
-- Environment: Staging FIRST, then Production after approval
-- ============================================================
-- Context:
--   - Anonymous (unauthenticated) users may INSERT new customer
--     records as part of the booking flow. They must NEVER be
--     able to SELECT, UPDATE, or DELETE any customer data.
--   - Authenticated admin users need full access (CRUD).
-- ============================================================

-- Step 1: Ensure prerequisite types and helper functions exist.
-- All statements are idempotent — safe to run on Production too.

-- Create app_role enum only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::text)
$$;

-- Step 2: Enable RLS on the customers table.
-- Until policies are added this effectively locks the table 
-- for everyone (fail-closed default).
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Admin policies (authenticated role via is_admin())
-- ============================================================

-- Admins can read all customers
CREATE POLICY "Admins can select customers"
    ON public.customers
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admins can insert customers
CREATE POLICY "Admins can insert customers"
    ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Admins can update customers
CREATE POLICY "Admins can update customers"
    ON public.customers
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete customers
CREATE POLICY "Admins can delete customers"
    ON public.customers
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================
-- Step 4: Anonymous INSERT policy (booking flow)
-- ============================================================
-- Anon users can only INSERT (submit their details).
-- No SELECT, UPDATE, or DELETE is permitted for anon.
CREATE POLICY "Anon users can submit customer details"
    ON public.customers
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- ============================================================
-- Verification queries (run these after applying the migration)
-- ============================================================
-- 1. Confirm RLS is enabled:
--    SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'customers';
--    Expected: relrowsecurity = true
--
-- 2. List all active policies on the table:
--    SELECT policyname, cmd, roles, qual, with_check
--    FROM pg_policies
--    WHERE tablename = 'customers';
--    Expected: 5 policies listed above.
