import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
  addWeeks,
  subWeeks,
} from "date-fns";
import { mk } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Appointment } from "@/hooks/useAppointments";
import { useIsMobile } from "@/hooks/use-mobile";

interface WeekCalendarProps {
  appointments: Appointment[];
  onSlotClick: (date: string, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const serviceLabels: Record<string, string> = {
  hair: "Коса",
  nails: "Нокти",
  waxing: "Депилација",
};

const serviceColors: Record<string, { bg: string; border: string; text: string }> = {
  hair: {
    bg: "bg-primary/20",
    border: "border-primary/40",
    text: "text-primary",
  },
  nails: {
    bg: "bg-pink-500/20",
    border: "border-pink-500/40",
    text: "text-pink-400",
  },
  waxing: {
    bg: "bg-violet-500/20",
    border: "border-violet-500/40",
    text: "text-violet-400",
  },
};

// Generate time slots from 08:00 to 20:00 (15 min intervals for positioning)
const TIME_SLOTS = Array.from({ length: 49 }, (_, i) => {
  const hour = Math.floor(i / 4) + 8;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

// Display hours only for the sidebar
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

const SLOT_HEIGHT = 16; // pixels per 15 min slot
const HOUR_HEIGHT = SLOT_HEIGHT * 4; // 64px per hour

const WeekCalendar = ({
  appointments,
  onSlotClick,
  onAppointmentClick,
}: WeekCalendarProps) => {
  const isMobile = useIsMobile();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [mobileViewDays, setMobileViewDays] = useState(1);

  // Get Monday-Saturday (skip Sunday)
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 6; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  // Mobile: show only some days
  const [mobileStartIndex, setMobileStartIndex] = useState(() => {
    // If mobile, start with Today
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    // Convert to index: Mon=0, Tue=1, ... Sat=5, Sun=ignore/clamp
    // Monday(1) -> 0
    const index = dayOfWeek === 0 ? 5 : dayOfWeek - 1;
    // Clamp to ensure we don't go out of bounds (max index depends on mobileViewDays, but safe to start at today)
    // If it's Sunday (0), we show Saturday (5) or start of next week? Let's show Saturday for now.
    return Math.max(0, Math.min(index, 5));
  });
  const visibleDays = useMemo(() => {
    if (!isMobile) return weekDays;
    return weekDays.slice(mobileStartIndex, mobileStartIndex + mobileViewDays);
  }, [isMobile, weekDays, mobileStartIndex, mobileViewDays]);

  const goToPreviousWeek = () => {
    if (isMobile && mobileStartIndex > 0) {
      setMobileStartIndex(mobileStartIndex - mobileViewDays);
    } else if (isMobile && mobileStartIndex === 0) {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
      setMobileStartIndex(6 - mobileViewDays);
    } else {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    }
  };

  const goToNextWeek = () => {
    if (isMobile && mobileStartIndex + mobileViewDays < 6) {
      setMobileStartIndex(mobileStartIndex + mobileViewDays);
    } else if (isMobile) {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
      setMobileStartIndex(0);
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    }
  };

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const goToToday = () => {
    const today = new Date();
    jumpToDate(today);
  };

  const jumpToDate = (date: Date | undefined) => {
    if (!date) return;
    const newWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    setCurrentWeekStart(newWeekStart);
    if (isMobile) {
      const dayOfWeek = date.getDay();
      // Monday = 1, so index = dayOfWeek - 1, but Sunday = 0 so cap at 5
      const index = dayOfWeek === 0 ? 5 : dayOfWeek - 1;
      setMobileStartIndex(Math.min(index, 6 - mobileViewDays));
    }
    setIsCalendarOpen(false); // Close calendar after selection
  };

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return appointments.filter((apt) => apt.appointment_date === dateStr);
  };

  // Calculate position and height for an appointment
  const getAppointmentGeometry = (apt: Appointment) => {
    const [hours, minutes] = apt.start_time.split(":").map(Number);
    const startMinutes = (hours - 8) * 60 + minutes;
    const endMinutes = startMinutes + apt.duration_minutes;
    const top = (startMinutes / 15) * SLOT_HEIGHT;
    const height = (apt.duration_minutes / 15) * SLOT_HEIGHT;
    return { top, height: Math.max(height, SLOT_HEIGHT), startMinutes, endMinutes };
  };

  // Group overlapping appointments and calculate layout
  const getDayLayout = (dayAppointments: Appointment[]) => {
    if (dayAppointments.length === 0) return {};

    // 1. Sort by start time, then duration
    const sorted = [...dayAppointments].sort((a, b) => {
      const aStart = getAppointmentGeometry(a).startMinutes;
      const bStart = getAppointmentGeometry(b).startMinutes;
      if (aStart !== bStart) return aStart - bStart;
      return b.duration_minutes - a.duration_minutes;
    });

    // 2. Group into connected clusters
    const clusters: Appointment[][] = [];
    let currentCluster: Appointment[] = [];
    let clusterEnd = -1;

    sorted.forEach((apt) => {
      const { startMinutes, endMinutes } = getAppointmentGeometry(apt);
      
      if (currentCluster.length === 0) {
        currentCluster.push(apt);
        clusterEnd = endMinutes;
      } else {
        // If this appointment starts after the current cluster ends, seal the cluster
        if (startMinutes >= clusterEnd) {
          clusters.push(currentCluster);
          currentCluster = [apt];
          clusterEnd = endMinutes;
        } else {
          // Overlap (or adjacent) - add to cluster
          currentCluster.push(apt);
          clusterEnd = Math.max(clusterEnd, endMinutes);
        }
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    // 3. Layout each cluster
    const layout: Record<string, { left: string; width: string }> = {};

    clusters.forEach((cluster) => {
      const columns: Appointment[][] = [];

      cluster.forEach((apt) => {
        let placed = false;
        // Try to fit in existing columns
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastInCol = col[col.length - 1];
          const lastEnd = getAppointmentGeometry(lastInCol).endMinutes;
          const currentStart = getAppointmentGeometry(apt).startMinutes;

          if (currentStart >= lastEnd) {
            col.push(apt);
            placed = true;
            break;
          }
        }
        // If didn't fit, start new column
        if (!placed) {
          columns.push([apt]);
        }
      });

      const widthPercent = 100 / columns.length;
      
      columns.forEach((col, colIndex) => {
        col.forEach((apt) => {
          layout[apt.id] = {
            left: `${colIndex * widthPercent}%`,
            width: `${widthPercent}%`,
          };
        });
      });
    });

    return layout;
  };

  // Get current time position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < 8 || hours >= 20) return null;
    const minutesSince8 = (hours - 8) * 60 + minutes;
    return (minutesSince8 / 15) * SLOT_HEIGHT;
  };

  const currentTimePosition = getCurrentTimePosition();

  // Handle click on empty slot
  const handleSlotClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const slotIndex = Math.floor(clickY / SLOT_HEIGHT);
    const time = TIME_SLOTS[Math.min(slotIndex, TIME_SLOTS.length - 1)];
    onSlotClick(format(day, "yyyy-MM-dd"), time);
  };

  return (
    <div className="salon-card overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="ml-2"
          >
            Денес
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start sm:flex-none">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-sm font-medium text-foreground hover:bg-accent/10 px-2 h-8"
              >
                {format(currentWeekStart, "MMMM yyyy", { locale: mk })}
                <CalendarIcon className="ml-2 h-3.5 w-3.5 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={undefined} // Don't show selected state for start of week
                onSelect={(date) => jumpToDate(date)}
                initialFocus
                modifiers={{
                  today: (date) => isToday(date),
                }}
                modifiersClassNames={{
                  today: "bg-accent/20 text-accent font-bold", // Style for "Today"
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {isMobile && (
          <div className="flex gap-1">
            <Button
              variant={mobileViewDays === 1 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMobileViewDays(1)}
              className="h-7 px-2 text-xs"
            >
              1Д
            </Button>
            <Button
              variant={mobileViewDays === 3 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setMobileViewDays(3);
                setMobileStartIndex(Math.min(mobileStartIndex, 3));
              }}
              className="h-7 px-2 text-xs"
            >
              3Д
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex flex-wrap gap-4 justify-center sm:justify-start">
        {Object.entries(serviceLabels).map(([key, label]) => {
          const colors = serviceColors[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-3 h-3 rounded-sm border",
                  colors.bg,
                  colors.border
                )}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="flex">
        {/* Time column */}
        <div className="flex-shrink-0 w-12 bg-secondary/30 border-r border-border">
          <div className="h-12 border-b border-border" /> {/* Header spacer */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-border/30 flex items-start justify-end pr-2 pt-0.5"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-muted-foreground leading-none -mt-1.5">
                  {hour.toString().padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Days columns */}
        <ScrollArea className="flex-1">
          <div className="flex min-w-max">
            {visibleDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isTodayColumn = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 min-w-[120px]",
                    isMobile && mobileViewDays === 1 && "min-w-full"
                  )}
                >
                  {/* Day header */}
                  <div
                    className={cn(
                      "h-12 border-b border-r border-border flex flex-col items-center justify-center sticky top-0 bg-card z-10",
                      isTodayColumn && "bg-accent/10"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs uppercase tracking-wide",
                        isTodayColumn ? "text-accent font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {format(day, "EEE", { locale: mk })}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isTodayColumn
                          ? "text-accent-foreground bg-accent rounded-full w-6 h-6 flex items-center justify-center"
                          : "text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Time grid */}
                  <div
                    className={cn(
                      "relative border-r border-border cursor-pointer",
                      isTodayColumn && "bg-accent/5"
                    )}
                    style={{ height: HOURS.length * HOUR_HEIGHT }}
                    onClick={(e) => handleSlotClick(day, e)}
                  >
                    {/* Hour lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-b border-border/30"
                        style={{ top: (hour - 8) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Current time indicator - REMOVED */}
                    {false && isTodayColumn && currentTimePosition !== null && (
                      <div
                        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                        style={{ top: currentTimePosition }}
                      >
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 h-0.5 bg-destructive/70" />
                      </div>
                    )}

                    {/* Appointments */}
                    {(() => {
                      const layoutMap = getDayLayout(dayAppointments);
                      return dayAppointments.map((apt) => {
                        const { top, height } = getAppointmentGeometry(apt);
                        const layoutStyle = layoutMap[apt.id] || { left: "0%", width: "100%" };
                        const colors = serviceColors[apt.service_type] || serviceColors.hair;
                        const isShort = height <= SLOT_HEIGHT * 2;

                        return (
                          <HoverCard key={apt.id} openDelay={100} closeDelay={50}>
                            <HoverCardTrigger asChild>
                            <div
                              className={cn(
                                "absolute rounded-md border shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:z-20 overflow-hidden",
                                colors.bg,
                                colors.border
                              )}
                              style={{ 
                                top, 
                                height,
                                left: layoutStyle.left,
                                width: layoutStyle.width,
                                padding: "1px" // slight padding to prevent border merge
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick(apt);
                              }}
                            >
                              <div
                                className={cn(
                                  "p-1 h-full flex flex-col",
                                  isShort && "flex-row items-center gap-1"
                                )}
                              >
                                <p
                                  className={cn(
                                    "text-[10px] font-semibold text-foreground truncate leading-tight",
                                    isShort && "text-[9px]"
                                  )}
                                >
                                  {apt.customer_name || "—"}
                                </p>
                                {!isShort && (
                                  <p
                                    className={cn(
                                      "text-[9px] truncate",
                                      colors.text
                                    )}
                                  >
                                    {serviceLabels[apt.service_type]}
                                  </p>
                                )}
                                {!isShort && height > SLOT_HEIGHT * 3 && (
                                  <p className="text-[9px] text-muted-foreground">
                                    {apt.duration_minutes} мин
                                  </p>
                                )}
                              </div>
                            </div>
                            </HoverCardTrigger>
                            <HoverCardContent
                            side="right"
                            align="start"
                            className="w-64 p-3"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-full",
                                    colors.bg
                                  )}
                                >
                                  <User className={cn("w-3 h-3", colors.text)} />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">
                                    {apt.customer_name || "Непознато"}
                                  </p>
                                  <p className={cn("text-xs", colors.text)}>
                                    {serviceLabels[apt.service_type]}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {apt.start_time.slice(0, 5)} — {apt.duration_minutes} мин
                                </span>
                              </div>
                              {apt.notes && (
                                <div className="bg-secondary/50 rounded p-2 text-xs text-muted-foreground italic">
                                  "{apt.notes}"
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                                Кликнете за уредување
                              </p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    });
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default WeekCalendar;
