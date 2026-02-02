import { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSunday, isToday, isSameWeek, addDays, subDays } from "date-fns";
import { mk } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const macedonianDays: { [key: string]: string } = {
  Monday: "Понеделник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четврток",
  Friday: "Петок",
  Saturday: "Сабота",
  Sunday: "Недела",
};

const macedonianMonths: { [key: string]: string } = {
  January: "Јануари",
  February: "Февруари",
  March: "Март",
  April: "Април",
  May: "Мај",
  June: "Јуни",
  July: "Јули",
  August: "Август",
  September: "Септември",
  October: "Октомври",
  November: "Ноември",
  December: "Декември",
};

const DatePicker = ({ selectedDate, onDateChange }: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const isClosed = isSunday(selectedDate);
  const today = new Date();

  const dayName = format(selectedDate, "EEEE");
  const monthName = format(selectedDate, "MMMM");
  const dayNumber = format(selectedDate, "d");
  const year = format(selectedDate, "yyyy");

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setOpen(false);
    }
  };

  const goToPreviousDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    let prevDay = subDays(selectedDate, 1);
    // Skip Sunday when navigating backwards
    if (isSunday(prevDay)) {
      prevDay = subDays(prevDay, 1);
    }
    onDateChange(prevDay);
  };

  const goToNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextDay = addDays(selectedDate, 1);
    // Skip Sunday when navigating forwards
    if (isSunday(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    onDateChange(nextDay);
  };

  return (
    <div className="salon-card p-4">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
          {/* Left chevron button */}
          <button
            onClick={goToPreviousDay}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all"
            aria-label="Претходен ден"
          >
            <ChevronLeft className="w-5 h-5 text-accent" />
          </button>

          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <div className="text-left">
                <p className="text-lg font-semibold text-foreground">
                  {macedonianDays[dayName] || dayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dayNumber} {macedonianMonths[monthName] || monthName} {year}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {isToday(selectedDate) && (
                  <span className="px-3 py-1 text-sm rounded-full bg-accent text-accent-foreground font-medium">
                    Денес
                  </span>
                )}
                {isClosed && (
                  <span className="px-3 py-1 text-sm rounded-full bg-destructive/20 text-destructive font-medium">
                    Неработен ден
                  </span>
                )}
                <CalendarIcon className="w-6 h-6 text-accent" />
              </div>
            </button>
          </PopoverTrigger>

          {/* Right chevron button */}
          <button
            onClick={goToNextDay}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 active:scale-95 transition-all"
            aria-label="Следен ден"
          >
            <ChevronRight className="w-5 h-5 text-accent" />
          </button>
        </div>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={mk}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              currentWeek: (date) => isSameWeek(date, today, { weekStartsOn: 1 }),
              sunday: (date) => isSunday(date),
            }}
            modifiersStyles={{
              currentWeek: {
                backgroundColor: "hsl(var(--accent) / 0.15)",
                borderRadius: "0",
              },
              sunday: {
                opacity: 0.4,
                textDecoration: "line-through",
              },
            }}
            disabled={(date) => isSunday(date)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
