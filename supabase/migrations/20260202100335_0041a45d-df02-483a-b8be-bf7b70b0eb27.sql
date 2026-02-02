-- Create a public view that only exposes non-sensitive appointment data
CREATE VIEW public.appointments_public
WITH (security_invoker = on) AS
SELECT 
    id,
    service_type,
    appointment_date,
    start_time,
    duration_minutes
FROM public.appointments
WHERE EXTRACT(dow FROM appointment_date) <> 0; -- Exclude Sundays

-- Drop the existing public SELECT policy on the base table
DROP POLICY IF EXISTS "Public can view non-Sunday appointments" ON public.appointments;

-- Create a new restrictive policy that denies direct public access to the base table
CREATE POLICY "No direct public access to appointments"
ON public.appointments
FOR SELECT
TO anon
USING (false);

-- Grant SELECT on the view to anon users
GRANT SELECT ON public.appointments_public TO anon;