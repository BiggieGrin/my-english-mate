import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

// Simplified schema - only email and password for registration
// Profile data will be collected in onboarding modal after first login
const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("כתובת מייל לא תקינה")
    .max(255, "כתובת מייל ארוכה מדי"),
  password: z
    .string()
    .min(8, "הסיסמה חייבת להיות לפחות 8 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate form data
    try {
      registerSchema.parse(formData);
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
      // Sign up without metadata - profile will be created with onboarding_completed = false
      // User will complete profile data in onboarding modal on dashboard
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // If user is immediately confirmed (auto-confirm enabled), session will be available
      if (data?.session) {
        toast({
          title: "ההרשמה הצליחה!",
          description: "מעביר לדף הבית...",
        });
        // onAuthStateChange will handle the navigation to dashboard
        // Dashboard will show OnboardingModal for profile completion
      } else {
        // Email confirmation required
        toast({
          title: "ההרשמה הצליחה!",
          description: "בדקו את המייל שלכם לאישור החשבון",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      let errorMessage = "אנא נסו שוב או פנו לתמיכה";
      if (error.message?.includes("already registered")) {
        errorMessage = "המייל כבר רשום במערכת. נסו להתחבר במקום.";
      }

      toast({
        title: "ההרשמה נכשלה",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // Direct OAuth signup - no metadata needed
      // User will complete profile in onboarding modal on dashboard
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
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
        title: "ההרשמה נכשלה",
        description: "אנא נסו שוב",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md p-8 bounce-in" dir="rtl">
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-2xl font-bold">הצטרפו אלינו!</h1>
          <Sparkles className="w-8 h-8 text-primary mr-2" />
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Google Sign-In */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            className="w-full"
            onClick={handleGoogleSignup}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            הרשמה עם Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                או
              </span>
            </div>
          </div>

          {/* Email Field */}
          <div>
            <Label htmlFor="email">המייל שלך</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setValidationErrors({ ...validationErrors, email: "" });
              }}
              className="text-lg"
              dir="ltr"
              disabled={isLoading}
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive mt-1">
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              placeholder="לפחות 8 תווים, אות גדולה וספרה"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setValidationErrors({ ...validationErrors, password: "" });
              }}
              className="text-lg"
              dir="ltr"
              disabled={isLoading}
            />
            {validationErrors.password && (
              <p className="text-sm text-destructive mt-1">
                {validationErrors.password}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "יוצר חשבון..." : "צור חשבון"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => navigate("/auth")}
            >
              התחבר כאן
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
