import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import viollaLogo from "@/assets/violla-logo.jpg";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Невалидна е-пошта");
const passwordSchema = z.string().min(6, "Лозинката мора да има минимум 6 карактери");

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [view, setView] = useState<"login" | "reset">("login");
  
  const { signIn, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    if (view === "login") {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "Проверете го вашето сандаче",
        description: "Испративме линк за ресетирање на вашата е-пошта.",
      });
      setView("login");
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Грешка при најава",
            description: "Невалидни податоци за најава",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Грешка",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={viollaLogo}
            alt="Violla Logo"
            className="w-24 h-24 rounded-full object-cover border-2 border-accent/30"
          />
        </div>

        <div className="salon-card p-6">
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            {view === "login" ? "Админ Најава" : "Ресетирај Лозинка"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {view === "login" 
              ? "Внесете ги вашите податоци" 
              : "Внесете ја вашата е-пошта за да добиете линк"}
          </p>

          <form onSubmit={view === "login" ? handleSubmit : handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Е-пошта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="bg-background"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {view === "login" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Лозинка</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setView("reset");
                      setErrors({});
                    }}
                    className="text-xs text-muted-foreground hover:text-accent underline"
                  >
                    Заборавена лозинка?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={loading}
            >
              {loading 
                ? "Чекајте..." 
                : view === "login" ? "Најави се" : "Испрати линк"}
            </Button>

            {view === "reset" && (
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setErrors({});
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground mt-2"
              >
                Назад кон најава
              </button>
            )}
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Назад кон почетна
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
