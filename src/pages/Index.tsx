import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import ServiceTabs from "@/components/ServiceTabs";
import DatePicker from "@/components/DatePicker";
import TimeSlots from "@/components/TimeSlots";
import ContactBar from "@/components/ContactBar";
import { SERVICE_OPTIONS } from "@/constants/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Phone, MessageCircle, Smartphone } from "lucide-react";
import { useAppointments, getOccupiedSlots } from "@/hooks/useAppointments";
import { generateTimeSlotsForDate } from "@/utils/workingHours";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("hair");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch appointments to check occupancy inside dialog
  const { appointments } = useAppointments(selectedDate, "all");

  // Request Dialog State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestTime, setRequestTime] = useState<string>("");
  
  // Form Fields
  const [formCategory, setFormCategory] = useState<string>("");
  const [formService, setFormService] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<"viber" | "whatsapp" | "sms">("viber");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Computed occupied slots for dialog select
  const occupiedSlots = useMemo(() => {
    if (!selectedDate || !formCategory) return new Set<string>();
    return getOccupiedSlots(appointments, selectedDate, formCategory);
  }, [appointments, selectedDate, formCategory]);

  // Generate free time slots for dialog
  const availableDialogSlots = useMemo(() => {
    const slots = generateTimeSlotsForDate(selectedDate);
    // Filter occupied
    return slots.filter(time => !occupiedSlots.has(time));
  }, [selectedDate, occupiedSlots]);

  // Check for password recovery hash on landing page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      navigate("/auth" + hash);
    }
  }, [navigate]);

  const handleSlotSelect = (time: string) => {
    setRequestTime(time);
    setFormCategory(activeCategory);
    
    // Auto-select first service
    const catConfig = SERVICE_OPTIONS.find(c => c.id === activeCategory);
    if (catConfig && catConfig.subServices.length > 0) {
      setFormService(catConfig.subServices[0].id);
    } else {
      setFormService("");
    }

    setCustomerName("");
    setCustomerPhone("");
    setContactMethod("viber");
    setIsSuccess(false);
    setIsRequestOpen(true);
  };

  const handleCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    const catConfig = SERVICE_OPTIONS.find(c => c.id === newCat);
    if (catConfig && catConfig.subServices.length > 0) {
      setFormService(catConfig.subServices[0].id);
    } else {
      setFormService("");
    }
  };

  const handleSubmitRequest = async () => {
    if (!formCategory || !formService || !customerName || !customerPhone || !requestTime) {
      toast({ title: "Грешка", description: "Ве молиме пополнете ги сите полиња", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const subConfig = SERVICE_OPTIONS.find(c => c.id === formCategory)?.subServices.find(s => s.id === formService);
      const contactLabel = contactMethod === "viber" ? "Viber" : contactMethod === "whatsapp" ? "WhatsApp" : "SMS";
      const notes = `[${subConfig?.label || formCategory}] (Pref: ${contactLabel})`;

      // 1. Insert Request (Use select to get ID, relying on public SELECT policy)
      const { data, error } = await supabase.from("appointment_requests").insert({
        customer_name: customerName,
        client_phone: customerPhone,
        service_type: formCategory,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: requestTime,
        duration_minutes: 30, 
        notes: notes,
      }).select().single();

      if (error) throw error;

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      toast({ title: "Грешка", description: "Проблем при испраќање.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 pt-0">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <section className="text-center space-y-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Избери категорија
            </h2>
            <div className="flex justify-center">
              <ServiceTabs 
                activeService={activeCategory} 
                onServiceChange={setActiveCategory} 
              />
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Избери датум
          </h2>
          <div className="flex justify-center">
            <DatePicker 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
          </div>
        </section>

        <section>
          <TimeSlots 
            selectedDate={selectedDate} 
            activeService={activeCategory} 
            onSlotSelect={handleSlotSelect}
          />
        </section>
      </main>

      <ContactBar />

      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isSuccess ? "Барањето е испратено!" : "Закажи Термин"}</DialogTitle>
            {!isSuccess && (
              <DialogDescription>
                {format(selectedDate, "dd.MM.yyyy")}
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
              <div className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label>Категорија</Label>
                  <Select value={formCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue placeholder="Изберете категорија..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Услуга</Label>
                  <Select value={formService} onValueChange={setFormService} disabled={!formCategory}>
                    <SelectTrigger><SelectValue placeholder="Изберете услуга..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.find(c => c.id === formCategory)?.subServices.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Време</Label>
                  <Select value={requestTime} onValueChange={setRequestTime}>
                    <SelectTrigger><SelectValue placeholder="Изберете време..." /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {availableDialogSlots.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Label>Потврда преку</Label>
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
