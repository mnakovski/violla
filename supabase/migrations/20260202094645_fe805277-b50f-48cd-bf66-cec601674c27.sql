-- Enable realtime for appointments table so public UI updates immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;