import viollaLogo from "@/assets/violla-logo.jpg";

const Header = () => {
  return (
    <header className="salon-header backdrop-blur-sm border-b border-border/30 px-4 py-4 sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-center gap-3 text-white">
        <img 
          src={viollaLogo} 
          alt="Violla" 
          className="w-11 h-11 rounded-full object-cover border-2 border-white/30 shadow-md"
        />
        <h1 
          className="text-2xl tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Violla
        </h1>
      </div>
    </header>
  );
};

export default Header;
