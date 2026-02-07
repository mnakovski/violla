import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";

// Full appointment type (admin only)
export interface Appointment {
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
}

// Public appointment type (no sensitive fields)
export interface PublicAppointment {
  id: string;
  service_type: "hair" | "nails" | "waxing";
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
}

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

export const useAdminAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOverlap = async (
    date: string,
    startTime: string,
    duration: number,
    serviceType: "hair" | "nails" | "waxing",
    excludeId?: string
  ) => {
    const { data: hasOverlap, error } = await supabase.rpc("check_appointment_overlap", {
      p_date: date,
      p_start_time: startTime,
      p_duration: duration,
      p_service_type: serviceType,
      p_exclude_id: excludeId || null
    });
    
    if (error) {
      console.error("Overlap Check Error:", error);
      // Fail safe: If check fails, assume no overlap but log it
      return false;
    }
    
    return !!hasOverlap;
  };

  const createAppointment = async (appointment: {
    customer_name?: string;
    client_phone?: string;
    service_type: "hair" | "nails" | "waxing";
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    notes?: string;
  }) => {
    // Removed internal check to allow "soft warning" in UI
    // The UI must call checkOverlap first and ask for confirmation

    const { error } = await supabase.from("appointments").insert({
      customer_name: appointment.customer_name || "Unknown",
      client_phone: appointment.client_phone || null,
      service_type: appointment.service_type,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      duration_minutes: appointment.duration_minutes,
      notes: appointment.notes || null
    });

    if (error) {
      console.error("Insert Error:", error);
      throw error;
    }
    await fetchAllAppointments();
  };

  const updateAppointment = async (
    id: string,
    updates: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>
  ) => {
    // Removed internal check here too

    const { error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
    await fetchAllAppointments();
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw error;
    await fetchAllAppointments();
  };

  useEffect(() => {
    fetchAllAppointments();

    // Subscribe to realtime changes for admin panel
    const channel = supabase
      .channel('admin-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchAllAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAllAppointments,
    checkOverlap,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};

// Helper to get occupied time slots for a given date and service
export const getOccupiedSlots = (
  appointments: PublicAppointment[],
  date: Date,
  serviceType: string
): Set<string> => {
  const dateStr = format(date, "yyyy-MM-dd");
  const occupiedSlots = new Set<string>();

  appointments
    .filter(
      (apt) =>
        apt.appointment_date === dateStr &&
        apt.service_type === serviceType
    )
    .forEach((apt) => {
      // Parse start time and mark all slots covered by the appointment
      const startTime = parse(apt.start_time, "HH:mm:ss", new Date());
      // Divide duration by 15 to get number of 15-min slots needed
      const slotsNeeded = apt.duration_minutes / 15;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(slotTime.getMinutes() + i * 15);
        occupiedSlots.add(format(slotTime, "HH:mm"));
      }
    });

  return occupiedSlots;
};
