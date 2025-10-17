import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { z } from "zod";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Welcome Back!</h1>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup" onClick={() => navigate("/register")}>
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
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
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
