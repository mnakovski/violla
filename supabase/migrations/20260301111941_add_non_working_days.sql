-- 1. Create non_working_days table
CREATE TABLE IF NOT EXISTS public.non_working_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS on non_working_days
ALTER TABLE public.non_working_days ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for non_working_days

-- Public can view non-working days
DROP POLICY IF EXISTS "Public can view non-working days" ON public.non_working_days;
CREATE POLICY "Public can view non-working days"
    ON public.non_working_days
    FOR SELECT
    USING (true);

-- Admins can view all non-working days
DROP POLICY IF EXISTS "Admins can view all non_working days" ON public.non_working_days;
CREATE POLICY "Admins can view all non_working days"
    ON public.non_working_days
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
      )
    );

-- Admins can insert non-working days
DROP POLICY IF EXISTS "Admins can insert non-working days" ON public.non_working_days;
CREATE POLICY "Admins can insert non-working days"
    ON public.non_working_days
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
      )
    );

-- Admins can update non-working days
DROP POLICY IF EXISTS "Admins can update non-working days" ON public.non_working_days;
CREATE POLICY "Admins can update non-working days"
    ON public.non_working_days
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
      )
    );

-- Admins can delete non-working days
DROP POLICY IF EXISTS "Admins can delete non-working days" ON public.non_working_days;
CREATE POLICY "Admins can delete non-working days"
    ON public.non_working_days
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
      )
    );

-- 4. Create index for faster querying by date
CREATE INDEX IF NOT EXISTS idx_non_working_days_date ON public.non_working_days(date);
