import viollaLogo from "@/assets/violla-logo.jpg";

const Header = () => {
  return (
    <header className="salon-header px-4 py-8 text-center relative overflow-hidden">
      {/* Watermark logo */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <img 
          src={viollaLogo} 
          alt="" 
          className="w-48 h-48 object-cover opacity-10 blur-[1px]"
        />
      </div>
      
      {/* Main header content */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        <img 
          src={viollaLogo} 
          alt="Violla Салон" 
          className="w-16 h-16 rounded-full object-cover border-2 border-accent/60 shadow-lg"
        />
        <div className="text-left">
          <h1 className="text-3xl font-semibold text-foreground tracking-wide">
            Violla
          </h1>
          <p className="text-sm text-accent opacity-90">
            Салон за убавина
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
