import { Scissors, Sparkles, Heart, Eye } from "lucide-react";

interface ServiceTabsProps {
  activeService: string;
  onServiceChange: (service: string) => void;
}

const services = [
  { id: "hair", label: "Hair", icon: Scissors },
  { id: "nails", label: "Nails", icon: Sparkles },
  { id: "waxing", label: "Waxing", icon: Heart },
  { id: "eyebrows", label: "Eyebrows", icon: Eye },
];

const ServiceTabs = ({ activeService, onServiceChange }: ServiceTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
