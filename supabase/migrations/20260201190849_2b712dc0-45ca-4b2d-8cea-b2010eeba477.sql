-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('hair', 'nails', 'waxing');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type service_type NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes IN (30, 60, 90, 120)),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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
      AND role = _role
  )
$$;

-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Create function to check for overlapping appointments
CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
    p_date DATE,
    p_start_time TIME,
    p_duration INTEGER,
    p_service_type service_type,
    p_exclude_id UUID DEFAULT NULL
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
          AND a.service_type = p_service_type
          AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
          AND (
              -- New appointment starts during existing appointment
              (p_start_time >= a.start_time AND p_start_time < a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
              OR
              -- New appointment ends during existing appointment
              (p_end_time > a.start_time AND p_end_time <= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
              OR
              -- New appointment completely contains existing appointment
              (p_start_time <= a.start_time AND p_end_time >= a.start_time + (a.duration_minutes || ' minutes')::INTERVAL)
          )
    );
END;
$$;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for appointments updated_at
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles
    FOR SELECT
    USING (public.is_admin());

-- RLS Policies for appointments
-- Public can view appointments (except Sundays)
CREATE POLICY "Public can view non-Sunday appointments"
    ON public.appointments
    FOR SELECT
    USING (EXTRACT(DOW FROM appointment_date) != 0);

-- Admins can view all appointments including Sundays
CREATE POLICY "Admins can view all appointments"
    ON public.appointments
    FOR SELECT
    USING (public.is_admin());

-- Admins can insert appointments
CREATE POLICY "Admins can insert appointments"
    ON public.appointments
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Admins can update appointments
CREATE POLICY "Admins can update appointments"
    ON public.appointments
    FOR UPDATE
    USING (public.is_admin());

-- Admins can delete appointments
CREATE POLICY "Admins can delete appointments"
    ON public.appointments
    FOR DELETE
    USING (public.is_admin());

-- Create index for faster appointment queries
CREATE INDEX idx_appointments_date_service ON public.appointments(appointment_date, service_type);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);