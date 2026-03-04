-- ============================================================
-- Migration: Create appointment_requests table + RLS
-- Date: 2026-03-04
-- Environment: Staging FIRST, then Production after approval
-- ============================================================
-- This table was created manually in Supabase and was never
-- part of a migration. This script ensures it exists on all
-- environments with proper RLS.
-- ============================================================

-- Ensure prerequisite enum exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.service_type AS ENUM ('hair', 'nails', 'waxing');
    END IF;
END$$;

-- Create the table if missing
CREATE TABLE IF NOT EXISTS public.appointment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    client_phone TEXT,
    service_type public.service_type NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Admin policies (full access for authenticated admins)
-- ============================================================
CREATE POLICY "Admins can select appointment_requests"
    ON public.appointment_requests
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert appointment_requests"
    ON public.appointment_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update appointment_requests"
    ON public.appointment_requests
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete appointment_requests"
    ON public.appointment_requests
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================
-- Anon INSERT policy (public booking form submission)
-- ============================================================
-- Note: PostgREST RETURNING (used by .select() after .insert())
-- does NOT require a separate SELECT policy — it works via the
-- INSERT permission. So anon can still get back data.id after
-- inserting without any SELECT policy.
CREATE POLICY "Anon users can submit booking requests"
    ON public.appointment_requests
    FOR INSERT
    TO anon
    WITH CHECK (true);
