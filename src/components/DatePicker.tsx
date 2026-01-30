import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, isSunday, isToday } from "date-fns";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DatePicker = ({ selectedDate, onDateChange }: DatePickerProps) => {
  const handlePrevDay = () => {
    const newDate = addDays(selectedDate, -1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    onDateChange(newDate);
  };

  const isClosed = isSunday(selectedDate);

  return (
    <div className="salon-card p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {format(selectedDate, "EEEE")}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "d MMMM yyyy")}
          </p>
          {isToday(selectedDate) && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground font-medium">
              Today
            </span>
          )}
          {isClosed && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive font-medium">
              Closed
            </span>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default DatePicker;
