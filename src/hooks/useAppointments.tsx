import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";

export interface Appointment {
  id: string;
  service_type: "hair" | "nails" | "waxing";
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useAppointments = (date?: Date, serviceType?: string) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let query = supabase.from("appointments").select("*");
      
      if (date) {
        query = query.eq("appointment_date", format(date, "yyyy-MM-dd"));
      }
      
      if (serviceType && serviceType !== "all" && (serviceType === "hair" || serviceType === "nails" || serviceType === "waxing")) {
        query = query.eq("service_type", serviceType);
      }
      
      query = query.order("appointment_date", { ascending: true })
                   .order("start_time", { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [date?.toDateString(), serviceType]);

  return { appointments, loading, error, refetch: fetchAppointments };
};

export const useAdminAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllAppointments = async () => {
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
  };

  const createAppointment = async (appointment: {
    service_type: "hair" | "nails" | "waxing";
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    notes?: string;
  }) => {
    // Check for overlapping appointments
    const { data: hasOverlap } = await supabase.rpc("check_appointment_overlap", {
      p_date: appointment.appointment_date,
      p_start_time: appointment.start_time,
      p_duration: appointment.duration_minutes,
      p_service_type: appointment.service_type,
    });

    if (hasOverlap) {
      throw new Error("Овој термин се преклопува со постоечки термин");
    }

    const { error } = await supabase.from("appointments").insert([appointment]);
    if (error) throw error;
    await fetchAllAppointments();
  };

  const updateAppointment = async (
    id: string,
    updates: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>
  ) => {
    // Check for overlapping appointments (excluding current one)
    if (updates.appointment_date || updates.start_time || updates.duration_minutes) {
      const current = appointments.find((a) => a.id === id);
      if (current) {
        const { data: hasOverlap } = await supabase.rpc("check_appointment_overlap", {
          p_date: updates.appointment_date || current.appointment_date,
          p_start_time: updates.start_time || current.start_time,
          p_duration: updates.duration_minutes || current.duration_minutes,
          p_service_type: (updates.service_type || current.service_type) as "hair" | "nails" | "waxing",
          p_exclude_id: id,
        });

        if (hasOverlap) {
          throw new Error("Овој термин се преклопува со постоечки термин");
        }
      }
    }

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
  }, []);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAllAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};

// Helper to get occupied time slots for a given date and service
export const getOccupiedSlots = (
  appointments: Appointment[],
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
      const slotsNeeded = apt.duration_minutes / 30;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(slotTime.getMinutes() + i * 30);
        occupiedSlots.add(format(slotTime, "HH:mm"));
      }
    });

  return occupiedSlots;
};
