-- 1. Add customer_name column
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Relax RLS for testing (Allow Anon Insert/Delete)
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.appointments;
CREATE POLICY "Allow All Insert" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
CREATE POLICY "Allow All Delete" ON public.appointments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Admins can update appointments" ON public.appointments;
CREATE POLICY "Allow All Update" ON public.appointments FOR UPDATE USING (true);
