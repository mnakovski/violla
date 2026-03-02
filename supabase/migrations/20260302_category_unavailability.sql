-- Extend non_working_days to support category-specific blocks

-- 1. Add new columns (with defaults for backward compatibility)
ALTER TABLE public.non_working_days
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN IF NOT EXISTS category_id TEXT DEFAULT NULL;

-- 2. Drop the old UNIQUE constraint on date (drop the constraint, not the index directly)
ALTER TABLE public.non_working_days DROP CONSTRAINT IF EXISTS non_working_days_date_key;

-- 3. Add partial unique indexes:
--    - Only one FULL_DAY entry per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_nwd_unique_full_day
  ON public.non_working_days (date)
  WHERE type = 'FULL_DAY';

--    - Only one CATEGORY entry per date+category
CREATE UNIQUE INDEX IF NOT EXISTS idx_nwd_unique_category
  ON public.non_working_days (date, category_id)
  WHERE type = 'CATEGORY';

-- 4. Add a check constraint so CATEGORY entries must have a category_id
ALTER TABLE public.non_working_days
  DROP CONSTRAINT IF EXISTS chk_nwd_category_has_id;

ALTER TABLE public.non_working_days
  ADD CONSTRAINT chk_nwd_category_has_id
  CHECK (
    (type = 'FULL_DAY' AND category_id IS NULL) OR
    (type = 'CATEGORY' AND category_id IS NOT NULL)
  );
