import viollaLogo from "@/assets/violla-logo.jpg";

const Header = () => {
  return (
    <header className="salon-header px-4 py-6 text-center">
      <div className="flex items-center justify-center gap-3">
        <img 
          src={viollaLogo} 
          alt="Violla Salon" 
          className="w-14 h-14 rounded-full object-cover border-2 border-salon-champagne/50"
        />
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-primary-foreground tracking-wide">
            Violla
          </h1>
          <p className="text-sm text-salon-champagne-light opacity-90">
            Beauty Salon
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
