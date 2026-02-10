import { useAppointments, getOccupiedSlots } from "@/hooks/useAppointments";
import { generateTimeSlotsForDate, getWorkingHours } from "@/utils/workingHours";

interface TimeSlotsProps {
  selectedDate: Date;
  activeService: string;
  onSlotSelect?: (time: string) => void;
}

const TimeSlots = ({ selectedDate, activeService, onSlotSelect }: TimeSlotsProps) => {
  const { isOpen, start, end } = getWorkingHours(selectedDate);
  const { appointments, loading } = useAppointments(selectedDate, activeService);
  
  if (!isOpen) {
    return (
      <div className="salon-card p-8 text-center">
        <div className="text-4xl mb-3">🌙</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Неработен ден
        </h3>
        <p className="text-sm text-muted-foreground">
          Салонот не работи во Недела.
        </p>
      </div>
    );
  }

  const timeSlots = generateTimeSlotsForDate(selectedDate);
  const occupiedSlots = getOccupiedSlots(appointments, selectedDate, activeService);

  return (
    <div className="salon-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Достапни термини ({start}:00 - {end}:00)
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-accent/80"></div>
            <span>Слободно</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-muted"></div>
            <span>Зафатено</span>
          </div>
        </div>
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
                className={`time-slot text-xs py-1.5 w-full transition-all active:scale-95 ${
                  isOccupied 
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
