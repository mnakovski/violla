import { useMemo } from "react";
import { useAppointments, getOccupiedSlotsForCustomer, SHARED_SLOT_SERVICES } from "@/hooks/useAppointments";
import { useNonWorkingDays, isNonWorkingDay } from "@/hooks/useNonWorkingDays";
import { generateTimeSlotsForDate30, generateNailsSlots } from "@/utils/workingHours";

const ALL_CATEGORIES = ["hair", "nails", "waxing", "makeup"] as const;

/**
 * useAvailability
 *
 * Single source of truth for what is actually bookable on a given date.
 * Drives the proactive filtering in the customer booking flow.
 *
 * Returns:
 *  - blockedCategories  : categories that cannot be booked (blocked day or fully booked)
 *  - getAvailableSlots  : fn(category) → free time slots for that category on the date
 *  - loading            : true while appointment/nwd data is loading
 */
export const useAvailability = (date: Date) => {
  const { nonWorkingDays, loading: nwdLoading } = useNonWorkingDays();
  const { appointments, loading: aptsLoading } = useAppointments(date, "all");

  const loading = nwdLoading || aptsLoading;

  // All working-hour slots for the day using 30-min intervals (client-facing).
  // NOTE: workingSlots here is used only for non-nails categories.
  // Nails gets its own generator with the Mon/Wed/Fri 18:30 cap.
  const workingSlots = useMemo(
    () => generateTimeSlotsForDate30(date, nonWorkingDays),
    [date, nonWorkingDays]
  );

  const nailsWorkingSlots = useMemo(
    () => generateNailsSlots(date, nonWorkingDays),
    [date, nonWorkingDays]
  );

  /**
   * For each category: compute available slots using the shared-slot logic
   * (nails / waxing / makeup cross-block each other; hair is independent).
   */
  const slotsByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const cat of ALL_CATEGORIES) {
      // Pick the correct base slot list per category
      const baseSlots = cat === "nails" ? nailsWorkingSlots : workingSlots;
      // If the entire salon is closed OR this specific category is blocked → no slots
      if (isNonWorkingDay(date, nonWorkingDays, cat) || baseSlots.length === 0) {
        map[cat] = [];
        continue;
      }
      const occupied = getOccupiedSlotsForCustomer(appointments, date, cat);
      map[cat] = baseSlots.filter((t) => !occupied.has(t));
    }
    return map;
  }, [date, nonWorkingDays, appointments, workingSlots, nailsWorkingSlots]);

  /** Categories with zero bookable slots (blocked day or fully booked). */
  const blockedCategories = useMemo(
    () => new Set<string>(ALL_CATEGORIES.filter((cat) => slotsByCategory[cat].length === 0)),
    [slotsByCategory]
  );

  /** Returns the free time slots for a given category on the selected date. */
  const getAvailableSlots = (category: string): string[] =>
    slotsByCategory[category] ?? [];

  return { blockedCategories, getAvailableSlots, loading };
};
