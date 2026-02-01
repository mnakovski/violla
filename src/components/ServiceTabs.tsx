import { Scissors, Sparkles, Heart } from "lucide-react";

interface ServiceTabsProps {
  activeService: string;
  onServiceChange: (service: string) => void;
}

const services = [
  { id: "hair", label: "Коса", icon: Scissors },
  { id: "nails", label: "Нокти", icon: Sparkles },
  { id: "waxing", label: "Депилација", icon: Heart },
];

const ServiceTabs = ({ activeService, onServiceChange }: ServiceTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service) => {
        const Icon = service.icon;
        const isActive = activeService === service.id;
        
        return (
          <button
            key={service.id}
            onClick={() => onServiceChange(service.id)}
            className={`service-tab flex items-center gap-2 whitespace-nowrap ${
              isActive ? "service-tab-active" : "hover:bg-secondary"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{service.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ServiceTabs;
