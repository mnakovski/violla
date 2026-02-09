import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { mk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_OPTIONS } from "@/constants/services";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { CheckCircle2, Phone, MessageCircle, Smartphone } from "lucide-react";
import viollaLogo from "@/assets/new-logo.jpg";
import WeekCalendar from "@/components/admin/WeekCalendar";

const Index = () => {
  const { toast } = useToast();
  
  // Public Filter State
  const [activeCategory, setActiveCategory] = useState<"hair" | "nails" | "waxing">("hair");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch Appointments (Read-Only)
  // We actually need ALL appointments to show occupied slots properly
  // But we filter by date range inside WeekCalendar logic usually. 
  // Let's reuse useAppointments which fetches public appointments.
  const { appointments } = useAppointments(currentDate, "all"); 
  
  // Request Dialog State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestDate, setRequestDate] = useState<string>("");
  const [requestTime, setRequestTime] = useState<string>("");
  const [requestService, setRequestService] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<"viber" | "whatsapp" | "sms">("viber");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle slot click from Calendar
  const handleSlotClick = (date: string, time: string) => {
    setRequestDate(date);
    setRequestTime(time);
    // Reset form
    setCustomerName("");
    setCustomerPhone("");
    setContactMethod("viber");
    setRequestService("");
    setIsSuccess(false);
    setIsRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestService || !customerName || !customerPhone) {
      toast({ title: "Грешка", description: "Ве молиме пополнете ги сите полиња", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find sub-service label
      const catConfig = SERVICE_OPTIONS.find(c => c.id === activeCategory);
      const subConfig = catConfig?.subServices.find(s => s.id === requestService);
      
      // Construct notes with preference
      const contactLabel = contactMethod === "viber" ? "Viber" : contactMethod === "whatsapp" ? "WhatsApp" : "SMS";
      const notes = `[${subConfig?.label || activeCategory}] (Pref: ${contactLabel})`;

      const { error } = await supabase.from("appointment_requests").insert({
        customer_name: customerName,
        client_phone: customerPhone,
        service_type: activeCategory,
        appointment_date: requestDate,
        start_time: requestTime,
        duration_minutes: 30, // Default assumption
        notes: notes,
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast({ title: "Грешка", description: "Проблем при испраќање.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert appointments to read-only format for WeekCalendar
  // We want to show them as "Occupied" blocks without details
  const publicAppointments = useMemo(() => {
    return appointments.map(apt => ({
      ...apt,
      customer_name: "Зафатено", // Mask name
      client_phone: "",
      notes: "",
      // Keep ID and time for layout
    })) as Appointment[];
  }, [appointments]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={viollaLogo} className="w-9 h-9 rounded-full border border-border" alt="Logo" />
            <span className="font-serif font-semibold text-lg tracking-wide">Violla</span>
          </div>
          
          {/* Category Switcher */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            {(["hair", "nails", "waxing"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-all
                  ${activeCategory === cat 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"}
                `}
              >
                {cat === "hair" ? "Коса" : cat === "nails" ? "Нокти" : "Деп."}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-2 py-6">
        <div className="mb-6 px-2">
          <h1 className="text-2xl font-bold text-foreground mb-1">Закажете Термин</h1>
          <p className="text-muted-foreground text-sm">
            Изберете слободен термин од календарот за <strong>{activeCategory === "hair" ? "Коса" : activeCategory === "nails" ? "Нокти" : "Депилација"}</strong>.
          </p>
        </div>

        {/* Calendar */}
        <WeekCalendar 
          appointments={publicAppointments.filter(a => a.service_type === activeCategory)} // Show only relevant category slots occupied? 
          // Actually, if a hairdresser is busy, they are busy. 
          // But we don't track resources yet (Employee A vs Employee B). 
          // Assuming single resource per category for simplicity or simple overlap check.
          // Let's show ALL appointments as occupied to prevent double booking ANYONE if we assume 1 seat per category.
          // Or better: filter by category if they are distinct resources.
          // Miki said: "горе првично си стои на коса ама ако сакам си бирам нокти". 
          // Usually salons have different people for different services.
          // So filtering by category is correct.
          
          onSlotClick={handleSlotClick}
          onAppointmentClick={() => {}} // No action on clicking occupied slots
        />
      </main>

      {/* Request Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{isSuccess ? "Барањето е испратено!" : "Детали за терминот"}</DialogTitle>
            {!isSuccess && (
              <DialogDescription>
                {requestDate && format(new Date(requestDate), "dd.MM.yyyy")} во {requestTime}
              </DialogDescription>
            )}
          </DialogHeader>

          {isSuccess ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-muted-foreground text-sm">
                Вашето барање е примено. Ќе добиете потврда наскоро.
              </p>
              <Button className="w-full mt-4" onClick={() => setIsRequestOpen(false)}>
                Во ред
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Услуга</Label>
                <Select value={requestService} onValueChange={setRequestService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Изберете услуга..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.find(c => c.id === activeCategory)?.subServices.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Име</Label>
                  <Input placeholder="Вашето име" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input placeholder="070..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Претпочитан контакт за потврда</Label>
                <RadioGroup value={contactMethod} onValueChange={(v: any) => setContactMethod(v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="viber" id="r1" />
                    <Label htmlFor="r1" className="cursor-pointer flex items-center gap-1"><Phone className="w-3 h-3" /> Viber</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="r2" />
                    <Label htmlFor="r2" className="cursor-pointer flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="r3" />
                    <Label htmlFor="r3" className="cursor-pointer flex items-center gap-1"><Smartphone className="w-3 h-3" /> SMS</Label>
                  </div>
                </RadioGroup>
              </div>

              <DialogFooter className="pt-4">
                <Button className="w-full" onClick={handleSubmitRequest} disabled={isSubmitting}>
                  {isSubmitting ? "Се испраќа..." : "Испрати Барање"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
