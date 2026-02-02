import { useState } from "react";
import Header from "@/components/Header";
import ServiceTabs from "@/components/ServiceTabs";
import DatePicker from "@/components/DatePicker";
import TimeSlots from "@/components/TimeSlots";
import ContactBar from "@/components/ContactBar";

const Index = () => {
  const [activeService, setActiveService] = useState("hair");
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="min-h-screen bg-background pb-52">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Service Selection */}
        <section className="text-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Избери услуга
          </h2>
          <div className="flex justify-center">
            <ServiceTabs 
              activeService={activeService} 
              onServiceChange={setActiveService} 
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
