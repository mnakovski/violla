import { getDay } from "date-fns";

export interface WorkingHours {
  start: number; // hour (0-23)
  end: number;   // hour (0-23)
  isOpen: boolean;
}

export const getWorkingHours = (date: Date): WorkingHours => {
  const day = getDay(date); // 0 = Sunday, 1 = Monday, ...

  // Sunday
  if (day === 0) {
    return { start: 0, end: 0, isOpen: false };
  }

  // Mon (1), Wed (3), Fri (5) -> 2nd Shift (14:00 - 20:00)
  if (day === 1 || day === 3 || day === 5) {
    return { start: 14, end: 20, isOpen: true };
  }

  // Tue (2), Thu (4), Sat (6) -> 1st Shift (09:00 - 16:00)
  // Note: Standard shift usually allows last booking at 15:30/15:45 if it closes at 16:00
  return { start: 9, end: 16, isOpen: true };
};

export const generateTimeSlotsForDate = (date: Date): string[] => {
  const { start, end, isOpen } = getWorkingHours(date);
  
  if (!isOpen) return [];

  const slots = [];
  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:15`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
    slots.push(`${hour.toString().padStart(2, "0")}:45`);
  }
  return slots;
};
