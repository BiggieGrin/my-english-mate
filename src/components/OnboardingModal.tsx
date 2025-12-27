import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatGrade } from "@/lib/gradeUtils";
import { LogOut } from "lucide-react";

// Validation schema - profile data collected during onboarding
const onboardingSchema = z.object({
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
  parentEmail: z
    .string()
    .trim()
    .email("כתובת מייל הורה לא תקינה")
    .max(255, "כתובת מייל ארוכה מדי"),
});

interface OnboardingModalProps {
  isOpen: boolean;
  userId: string;
}

export default function OnboardingModal({
  isOpen,
  userId,
}: OnboardingModalProps) {
  console.log("OnboardingModal render - isOpen:", isOpen, "userId:", userId);

  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    parentEmail: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate form data with Zod schema
    try {
      onboardingSchema.parse(formData);
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
      // Update profile with onboarding data and mark onboarding as completed
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.name,
          grade: parseInt(formData.grade),
          parent_email: formData.parentEmail,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (error) throw error;

      // Calculate and set age group in localStorage based on grade
      const ageGroup =
        parseInt(formData.grade) <= 3
          ? "young"
          : parseInt(formData.grade) <= 6
          ? "middle"
          : "high";
      localStorage.setItem("ageGroup", ageGroup);

      // Show success message
      toast({
        title: "ברוכים הבאים!",
        description: "הפרופיל שלך הושלם בהצלחה",
      });

      // Reload page to refresh dashboard with complete profile
      window.location.reload();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לשמור את הפרטים. נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  console.log("OnboardingModal rendering Dialog component...");

  return (
    <Dialog open={isOpen} modal onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby="onboarding-description"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">בואו נכיר!</DialogTitle>
          <p
            id="onboarding-description"
            className="text-center text-muted-foreground mt-2"
          >
            כמה פרטים קטנים לפני שנתחיל
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <Input
              id="name"
              placeholder="שם מלא"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setValidationErrors({ ...validationErrors, name: "" });
              }}
              disabled={isLoading}
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive mt-1">
                {validationErrors.name}
              </p>
            )}
          </div>

          {/* Grade Field */}
          <div>
            <Select
              value={formData.grade}
              onValueChange={(value) => {
                setFormData({ ...formData, grade: value });
                setValidationErrors({ ...validationErrors, grade: "" });
              }}
              disabled={isLoading}
            >
              <SelectTrigger dir="rtl">
                <SelectValue placeholder="כיתה" className="text-muted-foreground" />
              </SelectTrigger>
              <SelectContent className="rtl:text-right" dir="rtl">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                  <SelectItem key={grade} value={grade.toString()}>
                    כיתה {formatGrade(grade)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.grade && (
              <p className="text-sm text-destructive mt-1">
                {validationErrors.grade}
              </p>
            )}
          </div>

          {/* Parent Email Field */}
          <div>
            <Input
              id="parentEmail"
              type="email"
              placeholder="מייל הורה"
              className="rtl:text-right"
              value={formData.parentEmail}
              onChange={(e) => {
                setFormData({ ...formData, parentEmail: e.target.value });
                setValidationErrors({ ...validationErrors, parentEmail: "" });
              }}
              disabled={isLoading}
              dir="ltr"
            />
            {validationErrors.parentEmail && (
              <p className="text-sm text-destructive mt-1">
                {validationErrors.parentEmail}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "שומר..." : "בואו נתחיל!"}
          </Button>

          {/* Logout Button */}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut className="ml-2 h-4 w-4" />
            התנתקות
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
