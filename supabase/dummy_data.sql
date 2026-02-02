
-- Insert dummy appointments for testing
INSERT INTO public.appointments (service_type, appointment_date, start_time, duration_minutes, notes)
VALUES 
  ('hair', CURRENT_DATE, '09:00', 60, 'Dummy Booking 1'),
  ('hair', CURRENT_DATE, '14:00', 30, 'Dummy Booking 2'),
  ('nails', CURRENT_DATE + INTERVAL '1 day', '10:00', 60, 'Dummy Booking 3'),
  ('hair', CURRENT_DATE + INTERVAL '1 day', '16:00', 30, 'Dummy Booking 4'),
  ('waxing', CURRENT_DATE + INTERVAL '2 days', '11:00', 30, 'Dummy Booking 5')
ON CONFLICT DO NOTHING;
