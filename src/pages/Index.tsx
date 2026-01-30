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
    <div className="min-h-screen bg-background pb-40">
      <Header />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Service Selection */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Select Service
          </h2>
          <ServiceTabs 
            activeService={activeService} 
            onServiceChange={setActiveService} 
          />
        </section>

        {/* Date Selection */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Select Date
          </h2>
          <DatePicker 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
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
