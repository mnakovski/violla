import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Full appointment type (admin only)
export type Appointment = {
  id: string;
  customer_name?: string;
  client_phone?: string;
  service_type: "hair" | "nails" | "waxing";
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Public appointment type (no sensitive fields)
export type PublicAppointment = {
  id: string;
  service_type: "hair" | "nails" | "waxing";
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
};

export const useAppointments = (date?: Date, serviceType?: string) => {
  const [appointments, setAppointments] = useState<PublicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      // Use the public view which only exposes non-sensitive columns
      // If table doesn't exist yet, fallback to appointments with restricted cols
      let query = supabase.from("appointments").select("id, service_type, appointment_date, start_time, duration_minutes");
      
      if (date) {
        query = query.eq("appointment_date", format(date, "yyyy-MM-dd"));
      }
      
      if (serviceType && serviceType !== "all" && ["hair", "nails", "waxing"].includes(serviceType)) {
        query = query.eq("service_type", serviceType);
      }
      
      // Order by date and time
      const { data, error } = await query
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      
      // Cast the result to PublicAppointment[]
      setAppointments((data as unknown as PublicAppointment[]) || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [date, serviceType]);

  useEffect(() => {
    fetchAppointments();

    // Subscribe to realtime changes for immediate UI updates
    const channel = supabase
      .channel('public-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
};
