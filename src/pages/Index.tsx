import { useState, useMemo } from "react";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { mk } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_OPTIONS } from "@/constants/services";
import { useAppointments, getOccupiedSlots } from "@/hooks/useAppointments";
import { Scissors, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Clock, User, Phone } from "lucide-react";
import viollaLogo from "@/assets/new-logo.jpg";

type Step = "category" | "service" | "date" | "details" | "success";

const BookingWizard = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("category");
  
  // Form State
  const [category, setCategory] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch appointments for overlap check
  const { appointments } = useAppointments(date, category);

  // Computed: Occupied Slots
  const occupiedSlots = useMemo(() => {
    if (!date || !category) return new Set<string>();
    return getOccupiedSlots(appointments, date, category);
  }, [appointments, date, category]);

  // Generate Time Slots (09:00 - 20:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour < 20; hour++) {
      for (let min of [0, 15, 30, 45]) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        // Simple check: if slot is in occupied set, skip (or mark disabled)
        if (!occupiedSlots.has(timeStr)) {
          slots.push(timeStr);
        }
      }
    }
    return slots;
  }, [occupiedSlots]);

  const handleSubmit = async () => {
    if (!category || !service || !date || !time || !name || !phone) return;

    setIsSubmitting(true);
    try {
      // Find service label for nicer display
      const catConfig = SERVICE_OPTIONS.find(c => c.id === category);
      const subConfig = catConfig?.subServices.find(s => s.id === service);
      const fullServiceLabel = subConfig ? `[${subConfig.label}]` : category;

      const { error } = await supabase.from("appointment_requests").insert({
        customer_name: name,
        client_phone: phone,
        service_type: category, // Base category for overlap logic
        appointment_date: format(date, "yyyy-MM-dd"),
        start_time: time,
        duration_minutes: 30, // Default duration, maybe customizable later
        notes: fullServiceLabel, // Store sub-service in notes
      });

      if (error) throw error;
      setStep("success");
    } catch (error) {
      console.error(error);
      toast({
        title: "Грешка",
        description: "Настана проблем при испраќање на барањето. Обидете се повторно.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case "category": return "Изберете Услуга";
      case "service": return "Изберете Тип";
      case "date": return "Изберете Термин";
      case "details": return "Вашите Податоци";
      case "success": return "Успешно!";
      default: return "";
    }
  };

  const handleBack = () => {
    if (step === "service") setStep("category");
    if (step === "date") setStep("service");
    if (step === "details") setStep("date");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Барањето е примено!</h2>
        <p className="text-slate-600 mb-8 max-w-xs">
          Ви благодариме {name}. Ќе добиете потврда штом го одобриме вашиот термин.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Закажи нов термин
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          {step !== "category" ? (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : <div className="w-9" />} {/* Spacer */}
          
          <div className="flex items-center gap-2">
            <img src={viollaLogo} className="w-8 h-8 rounded-full" alt="Logo" />
            <span className="font-serif font-medium text-lg">Violla</span>
          </div>
          
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-200">
        <div 
          className="h-full bg-slate-900 transition-all duration-300 ease-out"
          style={{ 
            width: step === "category" ? "25%" : 
                   step === "service" ? "50%" : 
                   step === "date" ? "75%" : "100%" 
          }}
        />
      </div>

      <main className="max-w-md mx-auto p-4 pt-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">{getStepTitle()}</h1>

        {/* Step 1: Category */}
        {step === "category" && (
          <div className="grid gap-4">
            {SERVICE_OPTIONS.map((opt) => (
              <Card 
                key={opt.id} 
                className="cursor-pointer hover:border-slate-400 transition-all hover:shadow-sm"
                onClick={() => { setCategory(opt.id); setStep("service"); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                    {opt.id === "hair" ? <Scissors className="w-6 h-6 text-purple-600" /> : 
                     opt.id === "nails" ? <Sparkles className="w-6 h-6 text-pink-600" /> :
                     <Sparkles className="w-6 h-6 text-amber-600" />}
                  </div>
                  <div className="text-lg font-medium">{opt.label}</div>
                  <ChevronRight className="ml-auto w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Service */}
        {step === "service" && (
          <div className="grid gap-3">
            {SERVICE_OPTIONS.find(c => c.id === category)?.subServices.map((sub) => (
              <Button
                key={sub.id}
                variant="outline"
                className="h-14 justify-start text-lg px-4"
                onClick={() => { setService(sub.id); setStep("date"); }}
              >
                {sub.label}
              </Button>
            ))}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === "date" && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setTime(""); }} // Reset time on date change
                disabled={(d) => isBefore(d, startOfToday())}
                locale={mk}
                className="rounded-md border-0"
                classNames={{
                  head_cell: "text-slate-500 font-normal text-[0.8rem]",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day_selected: "bg-slate-900 text-white hover:bg-slate-800 hover:text-white focus:bg-slate-900 focus:text-white",
                  day_today: "bg-slate-100 text-slate-900",
                }}
              />
            </div>

            {date && (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Слободни термини
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.length > 0 ? timeSlots.map((t) => (
                    <Button
                      key={t}
                      variant={time === t ? "default" : "outline"}
                      className={`text-sm ${time === t ? "bg-slate-900" : ""}`}
                      onClick={() => setTime(t)}
                    >
                      {t}
                    </Button>
                  )) : (
                    <div className="col-span-4 text-center text-muted-foreground py-4 text-sm">
                      Нема слободни термини за овој ден.
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button 
              className="w-full h-12 text-lg mt-4" 
              disabled={!date || !time}
              onClick={() => setStep("details")}
            >
              Продолжи
            </Button>
          </div>
        )}

        {/* Step 4: Details */}
        {step === "details" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-1 border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Услуга:</span>
                    <span className="font-medium">
                      {SERVICE_OPTIONS.find(c => c.id === category)?.subServices.find(s => s.id === service)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Датум:</span>
                    <span className="font-medium">
                      {date && format(date, "dd.MM.yyyy")} во {time}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Ваше Име</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input 
                      id="name" 
                      placeholder="Внесете име..." 
                      className="pl-9 h-11"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input 
                      id="phone" 
                      placeholder="070..." 
                      className="pl-9 h-11"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full h-12 text-lg bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20" 
              disabled={!name || !phone || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Се испраќа..." : "Потврди Барање"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookingWizard;
