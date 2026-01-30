import { isSunday } from "date-fns";

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

// Simulated availability data (in a real app, this would come from backend)
const getAvailability = (service: string, date: Date) => {
  const slots = generateTimeSlots();
  const dayOfWeek = date.getDay();
  
  // Random but consistent availability based on service and day
  const seed = service.length + dayOfWeek;
  
  return slots.map((slot, index) => ({
    time: slot,
    available: (index + seed) % 3 !== 0, // Some slots unavailable
  }));
};

const TimeSlots = ({ selectedDate, activeService }: TimeSlotsProps) => {
  const isClosed = isSunday(selectedDate);
  
  if (isClosed) {
    return (
      <div className="salon-card p-8 text-center">
        <div className="text-4xl mb-3">🌙</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          We're closed on Sundays
        </h3>
        <p className="text-sm text-muted-foreground">
          Please select another day to view availability
        </p>
      </div>
    );
  }

  const availability = getAvailability(activeService, selectedDate);

  return (
    <div className="salon-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Available Times
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-accent/80"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-muted"></div>
            <span>Busy</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {availability.map(({ time, available }) => (
          <div
            key={time}
            className={`time-slot ${
              available ? "time-slot-available" : "time-slot-unavailable"
            }`}
          >
            <span className="text-sm font-medium">{time}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-center text-muted-foreground">
        Contact us to book your appointment
      </p>
    </div>
  );
};

export default TimeSlots;
