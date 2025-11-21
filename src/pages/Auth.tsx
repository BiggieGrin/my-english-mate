import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('כתובת מייל לא תקינה')
    .max(255, 'כתובת מייל ארוכה מדי'),
  password: z.string()
    .min(1, 'יש להזין סיסמה')
});

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth.onAuthStateChange', _event, !!session);
      if (session) navigate('/dashboard');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth.getSession', !!session);
      if (session) navigate('/dashboard');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    try {
      loginSchema.parse(loginData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });

      if (error) throw error;

      toast({
        title: "ברוכים השבים!",
        description: "התחברת בהצלחה",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "ההתחברות נכשלה",
        description: "אנא בדקו את פרטי ההתחברות ונסו שוב",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        try {
          if (window.top) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (error: any) {
      toast({
        title: "ההתחברות נכשלה",
        description: "אנא נסו שוב",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Welcome Back!</h1>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isLoading} 
                className="w-full"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                התחבר עם Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">או</span>
                </div>
              </div>

              <div>
                <Label htmlFor="email">מייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={loginData.email}
                  onChange={(e) => {
                    setLoginData({ ...loginData, email: e.target.value });
                    setValidationErrors({ ...validationErrors, email: '' });
                  }}
                  required
                  className="mt-2"
                  dir="ltr"
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="הסיסמה שלך"
                  value={loginData.password}
                  onChange={(e) => {
                    setLoginData({ ...loginData, password: e.target.value });
                    setValidationErrors({ ...validationErrors, password: '' });
                  }}
                  required
                  className="mt-2"
                  dir="ltr"
                />
                {validationErrors.password && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.password}</p>
                )}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "מתחבר..." : "התחברות"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                עדיין אין לך חשבון?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate("/register")}
                >
                  הרשמו כאן
                </Button>
              </p>
            </div>
          </div>
      </Card>
    </div>
  );
}
