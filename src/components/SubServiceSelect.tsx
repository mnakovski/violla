import { SERVICE_OPTIONS } from "@/constants/services";

interface SubServiceSelectProps {
  activeService: string;
  activeSubService: string | null;
  onSubServiceChange: (subService: string) => void;
}

const SubServiceSelect = ({ 
  activeService, 
  activeSubService, 
  onSubServiceChange 
}: SubServiceSelectProps) => {
  const serviceConfig = SERVICE_OPTIONS.find(s => s.id === activeService);
  
  if (!serviceConfig || !serviceConfig.subServices.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
      {serviceConfig.subServices.map((sub) => (
        <button
          key={sub.id}
          onClick={() => onSubServiceChange(sub.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeSubService === sub.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {sub.label}
        </button>
      ))}
    </div>
  );
};

export default SubServiceSelect;
