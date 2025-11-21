import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { formatGrade } from "@/lib/gradeUtils";
import { Separator } from "@/components/ui/separator";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "השם חייב להיות לפחות 2 תווים")
    .max(100, "השם חייב להיות פחות מ-100 תווים")
    .regex(/^[a-zA-Zא-ת\s]+$/, "השם יכול להכיל רק אותיות"),
  grade: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 12;
  }, "יש לבחור כיתה תקינה"),
  level: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "יש לבחור רמת אנגלית" }),
  }),
  parentEmail: z.string().trim().email("כתובת מייל הורה לא תקינה").max(255, "כתובת מייל ארוכה מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "כתובת מייל ארוכה מדי"),
  password: z
    .string()
    .min(8, "הסיסמה חייבת להיות לפחות 8 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    level: "",
    parentEmail: "",
    email: "",
    password: "",
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Register.onAuthStateChange", _event, !!session);
      if (session) {
        // Check if there's pending registration data from Google OAuth
        const pendingData = sessionStorage.getItem('pendingRegistration');
        if (pendingData) {
          try {
            const data = JSON.parse(pendingData);
            // Update the user's metadata with the registration data
            await supabase.auth.updateUser({
              data: {
                full_name: data.name,
                grade: parseInt(data.grade),
                english_level: data.level,
                parent_email: data.parentEmail,
              }
            });
            sessionStorage.removeItem('pendingRegistration');
            
            const ageGroup = parseInt(data.grade) <= 3 ? "young" : parseInt(data.grade) <= 6 ? "middle" : "high";
            localStorage.setItem("ageGroup", ageGroup);
          } catch (error) {
            console.error('Failed to update user metadata:', error);
          }
        }
        navigate("/dashboard");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Register.getSession", !!session);
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateCurrentStep = () => {
    setValidationErrors({});

    try {
      switch (step) {
        case 1:
          registerSchema.pick({ name: true }).parse({ name: formData.name });
          break;
        case 2:
          registerSchema.pick({ grade: true }).parse({ grade: formData.grade });
          break;
        case 3:
          registerSchema.pick({ level: true }).parse({ level: formData.level });
          break;
        case 4:
          registerSchema.pick({ parentEmail: true }).parse({ parentEmail: formData.parentEmail });
          break;
        case 5:
          registerSchema.pick({ email: true, password: true }).parse({
            email: formData.email,
            password: formData.password,
          });
          break;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: formData.name,
              grade: parseInt(formData.grade),
              english_level: formData.level,
              parent_email: formData.parentEmail,
            },
          },
        });

        if (error) throw error;

        const ageGroup = parseInt(formData.grade) <= 3 ? "young" : parseInt(formData.grade) <= 6 ? "middle" : "high";
        localStorage.setItem("ageGroup", ageGroup);

        // If user is immediately confirmed (auto-confirm enabled), session will be available
        if (data?.session) {
          toast({
            title: "ההרשמה הצליחה!",
            description: "ברוכים הבאים למסע הלמידה שלכם!",
          });
          // onAuthStateChange will handle the navigation
        } else {
          // Email confirmation required
          toast({
            title: "ההרשמה הצליחה!",
            description: "בדקו את המייל שלכם לאישור החשבון",
          });
          setIsLoading(false);
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
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Store the form data in sessionStorage so we can retrieve it after OAuth
      sessionStorage.setItem('pendingRegistration', JSON.stringify({
        name: formData.name,
        grade: formData.grade,
        level: formData.level,
        parentEmail: formData.parentEmail,
      }));

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

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.length > 0;
      case 2:
        return formData.grade.length > 0;
      case 3:
        return formData.level.length > 0;
      case 4:
        return formData.parentEmail.length > 0;
      case 5:
        return formData.email.length > 0 && formData.password.length >= 6;
      default:
        return false;
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md p-8 bounce-in" dir="rtl">
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-2xl font-bold">בואו נכיר!</h1>
          <Sparkles className="w-8 h-8 text-primary mr-2" />
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div className="fade-in-up space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">איך קוראים לך?</h2>
                <p className="text-muted-foreground">ככה נדע איך לפנות אליך 😊</p>
              </div>
              <div>
                <Label htmlFor="name">השם שלך</Label>
                <Input
                  id="name"
                  placeholder="לדוגמה: יואב"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setValidationErrors({ ...validationErrors, name: "" });
                  }}
                  className="text-lg"
                  autoFocus
                />
                {validationErrors.name && <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in-up space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">באיזו כיתה את/ה?</h2>
                <p className="text-muted-foreground">ככה נדע מה מתאים ללמד</p>
              </div>
              <div>
                <Label htmlFor="grade">הכיתה שלך</Label>
                <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחרו כיתה" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        כיתה {formatGrade(grade)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in-up space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">מה רמת האנגלית שלך?</h2>
                <p className="text-muted-foreground">אל תדאגו, זה בסדר להתחיל מאפס!</p>
              </div>
              <div className="space-y-3">
                {[
                  { value: "beginner", label: "מתחיל - רק מתחיל ללמוד", icon: "🌱" },
                  { value: "intermediate", label: "בינוני - יודע בסיס", icon: "🌿" },
                  { value: "advanced", label: "מתקדם - טוב באנגלית", icon: "🌳" },
                ].map((level) => (
                  <Button
                    key={level.value}
                    variant={formData.level === level.value ? "default" : "outline"}
                    className="w-full justify-start text-right h-auto py-4"
                    onClick={() => setFormData({ ...formData, level: level.value })}
                  >
                    <span className="text-2xl ml-3">{level.icon}</span>
                    <span>{level.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in-up space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">מייל של הורה</h2>
                <p className="text-muted-foreground">כדי שההורים יוכלו לעקוב אחרי ההתקדמות</p>
              </div>
              <div>
                <Label htmlFor="parentEmail">מייל הורה</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  placeholder="parent@example.com"
                  value={formData.parentEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, parentEmail: e.target.value });
                    setValidationErrors({ ...validationErrors, parentEmail: "" });
                  }}
                  className="text-lg"
                  dir="ltr"
                />
                {validationErrors.parentEmail && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.parentEmail}</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="fade-in-up space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">פרטי כניסה</h2>
                <p className="text-muted-foreground">בחרו מייל וסיסמה לכניסה למערכת</p>
              </div>
              
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
                  <span className="bg-background px-2 text-muted-foreground">או</span>
                </div>
              </div>

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
                />
                {validationErrors.email && <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>}
              </div>
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
                />
                {validationErrors.password && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.password}</p>
                )}
              </div>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleNext} disabled={!isStepValid() || isLoading}>
            <ArrowRight className="ml-2" />
            {isLoading ? "יוצר חשבון..." : step === 5 ? "בואו נתחיל ללמוד!" : "המשך"}
          </Button>

          {step > 1 && (
            <Button variant="ghost" className="w-full" onClick={() => setStep(step - 1)} disabled={isLoading}>
              חזרה
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Register;
