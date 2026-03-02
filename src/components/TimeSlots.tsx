import { useAppointments, getOccupiedSlots } from "@/hooks/useAppointments";
import { generateTimeSlotsForDate, getWorkingHours } from "@/utils/workingHours";
import { useNonWorkingDays, isNonWorkingDay } from "@/hooks/useNonWorkingDays";

interface TimeSlotsProps {
  selectedDate: Date;
  activeService: string;
  onSlotSelect?: (time: string) => void;
}

const TimeSlots = ({ selectedDate, activeService, onSlotSelect }: TimeSlotsProps) => {
  const { nonWorkingDays } = useNonWorkingDays();
  const { appointments, loading } = useAppointments(selectedDate, activeService);
  const { isOpen, startHour, startMinute, endHour, endMinute } = getWorkingHours(selectedDate, nonWorkingDays);

  const isFullDayClosed = isNonWorkingDay(selectedDate, nonWorkingDays); // FULL_DAY only
  const isCategoryBlocked = isNonWorkingDay(selectedDate, nonWorkingDays, activeService); // includes CATEGORY


  // 1. Full salon closed (Sunday or FULL_DAY entry) — existing behaviour, unchanged
  if (!isOpen || isFullDayClosed) {
    const dateStr = selectedDate.toISOString().split("T")[0];
    const fullDayEntry = nonWorkingDays.find(
      (nwd) => nwd.date === dateStr && nwd.type === "FULL_DAY"
    );
    return (
      <div className="salon-card p-8 text-center">
        <div className="text-4xl mb-3">🌙</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Денес одмараме за да ве разубавиме утре ✨
        </h3>
        <p className="text-sm text-muted-foreground">
          {fullDayEntry?.reason || "Изберете друг термин."}
        </p>
      </div>
    );
  }

  // 2. Only this category is blocked — different message, no moon/title
  if (isCategoryBlocked) {
    return (
      <div className="salon-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Салонот работи, но оваа услуга не е достапна на избраниот ден. Ве молиме изберете друг термин.
        </p>
      </div>
    );
  }

  const timeSlots = generateTimeSlotsForDate(selectedDate, nonWorkingDays);
  const occupiedSlots = getOccupiedSlots(appointments, selectedDate, activeService);

  // Format time range for display (e.g. 08:30 - 14:30)
  const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
  const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

  return (
    <div className="salon-card p-4 pt-0">
      <div className="text-center mb-4 pt-2">
        <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
          Работно време: {startTimeStr} - {endTimeStr}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Се вчитува...
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {timeSlots.map((time) => {
            const isOccupied = occupiedSlots.has(time);
            return (
              <button
                key={time}
                onClick={() => !isOccupied && onSlotSelect && onSlotSelect(time)}
                disabled={isOccupied}
                className={`time-slot text-xs py-1.5 w-full transition-all active:scale-95 ${isOccupied
                  ? "time-slot-unavailable cursor-not-allowed opacity-50"
                  : "time-slot-available cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                <span className="font-medium">{time}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-center text-muted-foreground">
        Кликнете на термин за да закажете
      </p>
    </div>
  );
};

export default TimeSlots;
