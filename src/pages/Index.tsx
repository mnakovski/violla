import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ServiceTabs from "@/components/ServiceTabs";
import SubServiceSelect from "@/components/SubServiceSelect";
import DatePicker from "@/components/DatePicker";
import TimeSlots from "@/components/TimeSlots";
import ContactBar from "@/components/ContactBar";
import { SERVICE_OPTIONS } from "@/constants/services";

const Index = () => {
  const [activeService, setActiveService] = useState("hair");
  const [activeSubService, setActiveSubService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Reset sub-service when main service changes
  useEffect(() => {
    const serviceConfig = SERVICE_OPTIONS.find(s => s.id === activeService);
    if (serviceConfig && serviceConfig.subServices.length > 0) {
      setActiveSubService(serviceConfig.subServices[0].id);
    } else {
      setActiveSubService(null);
    }
  }, [activeService]);

  return (
    <div className="min-h-screen bg-background pb-52">
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
          <div className="min-h-[40px]">
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
          />
        </section>
      </main>

      <ContactBar />
    </div>
  );
};

export default Index;
