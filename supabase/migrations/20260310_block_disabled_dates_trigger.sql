-- ============================================================
-- Migration: Enforce blocked-date validation on appointment_requests
-- Date: 2026-03-10
-- Environment: Run on STAGING first, then PRODUCTION after approval.
-- ============================================================
-- This trigger fires BEFORE INSERT on appointment_requests (customer
-- public booking table). It rejects any request whose date is marked
-- as non-working in the non_working_days table — either as a FULL_DAY
-- salon closure or as a CATEGORY-specific block matching the service.
--
-- The admin `appointments` table is intentionally NOT covered here,
-- as admins are allowed to book on blocked dates as an override.
-- ============================================================

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

-- Attach trigger to appointment_requests (customer-facing public bookings only)
DROP TRIGGER IF EXISTS trg_check_non_working_day ON public.appointment_requests;
CREATE TRIGGER trg_check_non_working_day
    BEFORE INSERT ON public.appointment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.check_non_working_day_before_insert();
