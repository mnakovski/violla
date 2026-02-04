import viollaLogo from "@/assets/violla-logo.jpg";

const Header = () => {
  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-4 sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-center gap-3">
        <img 
          src={viollaLogo} 
          alt="Violla" 
          className="w-11 h-11 rounded-full object-cover border-2 border-accent/40 shadow-md"
        />
        <h1 
          className="text-2xl text-foreground tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Violla
        </h1>
      </div>
    </header>
  );
};

export default Header;
