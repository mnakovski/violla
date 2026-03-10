-- ============================================================
-- Migration: check_slot_available() DB function
-- Date: 2026-03-10
-- Environment: Run on STAGING first, then PRODUCTION after approval.
-- ============================================================
-- Returns a JSONB object describing whether a given slot is bookable.
-- Used as a pre-flight check from the customer booking flow before
-- the BEFORE INSERT trigger fires, so we can surface a clear message.
--
-- Return shape:
--   { "ok": true }
--   { "ok": false, "reason": "full_day_closed" }
--   { "ok": false, "reason": "category_blocked" }
--   { "ok": false, "reason": "slot_occupied" }
-- ============================================================

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

  -- 3. Slot overlap (re-uses same logic as check_appointment_overlap)
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

-- Grant execute to anon and authenticated so both flows can call it
GRANT EXECUTE ON FUNCTION public.check_slot_available(DATE, TIME, INTEGER, TEXT, UUID) TO anon, authenticated;
