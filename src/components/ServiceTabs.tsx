import { Scissors, Gem, Zap, Sparkles } from "lucide-react";

interface ServiceTabsProps {
  activeService: string;
  onServiceChange: (service: string) => void;
}

const services = [
  { id: "hair", label: "Коса", icon: Scissors },
  { id: "nails", label: "Нокти", icon: Gem },
  { id: "waxing", label: "Депилација", icon: Zap },
  { id: "makeup", label: "Шминка", icon: Sparkles },
];

const ServiceTabs = ({ activeService, onServiceChange }: ServiceTabsProps) => {
  return (
    <div className="grid grid-cols-4 gap-1.5 w-full">
      {services.map((service) => {
        const Icon = service.icon;
        const isActive = activeService === service.id;

        return (
          <button
            key={service.id}
            onClick={() => onServiceChange(service.id)}
            className={[
              // Base — flex column, centred, equal padding all sides
              "flex flex-col items-center justify-center gap-1.5",
              "rounded-xl py-2.5 px-1",
              "transition-all duration-200",
              "text-xs font-medium leading-none",
              isActive
                ? // Active: champagne gold pill
                "bg-primary text-primary-foreground shadow-md"
                : // Inactive: subtle card bg, muted text, gold border on hover
                "bg-secondary/40 text-muted-foreground border border-transparent hover:border-primary/50 hover:text-foreground hover:bg-secondary/60",
            ].join(" ")}
          >
            <Icon
              className="w-4 h-4 flex-shrink-0"
              strokeWidth={1.75}
            />
            <span className="truncate w-full text-center">{service.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ServiceTabs;
