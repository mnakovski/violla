import { getDay, format } from "date-fns";
import { NonWorkingDay } from "@/hooks/useNonWorkingDays";

export interface WorkingHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isOpen: boolean;
}

export const getWorkingHours = (date: Date, nonWorkingDays: NonWorkingDay[] = []): WorkingHours => {
  const day = getDay(date); // 0 = Sunday, 1 = Monday, ...
  const dateStr = format(date, "yyyy-MM-dd");

  // Custom non-working day — only FULL_DAY entries close the entire salon.
  // CATEGORY entries only block a specific service; the salon stays open.
  if (nonWorkingDays.some(nwd => nwd.date === dateStr && nwd.type === "FULL_DAY")) {
    return { startHour: 0, startMinute: 0, endHour: 0, endMinute: 0, isOpen: false };
  }

  // Sunday: Closed
  if (day === 0) {
    return { startHour: 0, startMinute: 0, endHour: 0, endMinute: 0, isOpen: false };
  }

  // Mon (1), Wed (3), Fri (5) -> 13:00 - 20:00
  if (day === 1 || day === 3 || day === 5) {
    return { startHour: 13, startMinute: 0, endHour: 20, endMinute: 0, isOpen: true };
  }

  // Sat (6) -> 09:00 - 15:00
  if (day === 6) {
    return { startHour: 9, startMinute: 0, endHour: 15, endMinute: 0, isOpen: true };
  }

  // Tue (2), Thu (4) -> 08:30 - 14:30
  return { startHour: 8, startMinute: 30, endHour: 14, endMinute: 30, isOpen: true };
};

export const generateTimeSlotsForDate = (date: Date, nonWorkingDays: NonWorkingDay[] = []): string[] => {
  const { startHour, startMinute, endHour, endMinute, isOpen } = getWorkingHours(date, nonWorkingDays);

  if (!isOpen) return [];

  const slots = [];
  // Calculate total minutes for range
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  // Generate slots every 15 mins (used by Admin calendar for precise positioning)
  for (let m = startTotal; m < endTotal; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots;
};

/**
 * Client-facing time slot generator — 30-minute intervals only.
 * Admin panel still uses generateTimeSlotsForDate (15-min) for precision.
 */
export const generateTimeSlotsForDate30 = (date: Date, nonWorkingDays: NonWorkingDay[] = []): string[] => {
  const { startHour, startMinute, endHour, endMinute, isOpen } = getWorkingHours(date, nonWorkingDays);

  if (!isOpen) return [];

  const slots = [];
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  // Generate slots every 30 mins
  for (let m = startTotal; m < endTotal; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots;
};

/**
 * Nails-specific client-facing slot generator.
 * Applies a hard cap of 18:30 on Mon (1), Wed (3), Fri (5) — the second-shift days (13:00–20:00).
 * All other days use the standard 30-min slots up to the working day end.
 */
export const generateNailsSlots = (date: Date, nonWorkingDays: NonWorkingDay[] = []): string[] => {
  const slots = generateTimeSlotsForDate30(date, nonWorkingDays);

  const day = getDay(date);
  const isSecondShiftDay = day === 1 || day === 3 || day === 5; // Mon, Wed, Fri

  if (!isSecondShiftDay) return slots;

  // Cap: last allowed slot is 18:30
  const LAST_ALLOWED = 18 * 60 + 30; // 18:30 in minutes
  return slots.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m <= LAST_ALLOWED;
  });
};
