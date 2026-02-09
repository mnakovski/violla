import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Header from "@/components/Header";
import ServiceTabs from "@/components/ServiceTabs";
import SubServiceSelect from "@/components/SubServiceSelect";
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

const Index = () => {
  const [activeService, setActiveService] = useState("hair");
  const [activeSubService, setActiveSubService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Request Dialog State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestTime, setRequestTime] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<"viber" | "whatsapp" | "sms">("viber");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check for password recovery hash on landing page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      navigate("/auth" + hash);
    }
  }, [navigate]);

  // Reset sub-service when main service changes
  useEffect(() => {
    const serviceConfig = SERVICE_OPTIONS.find(s => s.id === activeService);
    if (serviceConfig && serviceConfig.subServices.length > 0) {
      setActiveSubService(serviceConfig.subServices[0].id);
    } else {
      setActiveSubService(null);
    }
  }, [activeService]);

  const handleSlotSelect = (time: string) => {
    setRequestTime(time);
    setCustomerName("");
    setCustomerPhone("");
    setContactMethod("viber");
    setIsSuccess(false);
    setIsRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!customerName || !customerPhone) {
      toast({ title: "Грешка", description: "Ве молиме пополнете ги сите полиња", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find sub-service label
      const catConfig = SERVICE_OPTIONS.find(c => c.id === activeService);
      const subConfig = catConfig?.subServices.find(s => s.id === activeSubService);
      
      const contactLabel = contactMethod === "viber" ? "Viber" : contactMethod === "whatsapp" ? "WhatsApp" : "SMS";
      const notes = `[${subConfig?.label || activeService}] (Pref: ${contactLabel})`;

      const { error } = await supabase.from("appointment_requests").insert({
        customer_name: customerName,
        client_phone: customerPhone,
        service_type: activeService,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: requestTime,
        duration_minutes: 30, // Default
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

  return (
    <div className="min-h-screen bg-background pb-32 pt-0">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Service Selection */}
        <section className="text-center space-y-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Избери категорија
            </h2>
            <div className="flex justify-center">
              <ServiceTabs 
                activeService={activeService} 
                onServiceChange={setActiveService} 
              />
            </div>
          </div>

          {/* Sub Service Selection */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
             <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Избери услуга
            </h3>
            <SubServiceSelect 
              activeService={activeService}
              activeSubService={activeSubService}
              onSubServiceChange={setActiveSubService}
            />
          </div>
        </section>

        {/* Date Selection */}
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

        {/* Time Slots */}
        <section>
          <TimeSlots 
            selectedDate={selectedDate} 
            activeService={activeService} 
            onSlotSelect={handleSlotSelect}
          />
        </section>
      </main>

      <ContactBar />

      {/* Request Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{isSuccess ? "Барањето е испратено!" : "Закажи Термин"}</DialogTitle>
            {!isSuccess && (
              <DialogDescription>
                {format(selectedDate, "dd.MM.yyyy")} во {requestTime}
                <br/>
                {SERVICE_OPTIONS.find(s => s.id === activeService)?.subServices.find(sub => sub.id === activeSubService)?.label}
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
