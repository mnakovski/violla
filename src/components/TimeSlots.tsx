import { isSunday } from "date-fns";
import { useAppointments, getOccupiedSlots } from "@/hooks/useAppointments";

interface TimeSlotsProps {
  selectedDate: Date;
  activeService: string;
}

// Generate time slots from 08:00 to 20:00
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 20; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
};

const TimeSlots = ({ selectedDate, activeService }: TimeSlotsProps) => {
  const isClosed = isSunday(selectedDate);
  const { appointments, loading } = useAppointments(selectedDate, activeService);
  
  if (isClosed) {
    return (
      <div className="salon-card p-8 text-center">
        <div className="text-4xl mb-3">🌙</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Неработен ден
        </h3>
        <p className="text-sm text-muted-foreground">
          Ве молиме изберете друг ден
        </p>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();
  const occupiedSlots = getOccupiedSlots(appointments, selectedDate, activeService);

  return (
    <div className="salon-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Достапни термини
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
        <div className="grid grid-cols-4 gap-2">
          {timeSlots.map((time) => {
            const isOccupied = occupiedSlots.has(time);
            return (
              <div
                key={time}
                className={`time-slot ${
                  isOccupied ? "time-slot-unavailable" : "time-slot-available"
                }`}
              >
                <span className="text-sm font-medium">{time}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-center text-muted-foreground">
        Контактирајте нè за да закажете термин
      </p>
    </div>
  );
};

export default TimeSlots;
