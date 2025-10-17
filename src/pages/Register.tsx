import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'השם חייב להיות לפחות 2 תווים')
    .max(100, 'השם חייב להיות פחות מ-100 תווים')
    .regex(/^[a-zA-Zא-ת\s]+$/, 'השם יכול להכיל רק אותיות'),
  grade: z.string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 1 && num <= 12;
    }, 'יש לבחור כיתה תקינה'),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: 'יש לבחור רמת אנגלית' })
  }),
  parentEmail: z.string()
    .trim()
    .email('כתובת מייל הורה לא תקינה')
    .max(255, 'כתובת מייל ארוכה מדי'),
  email: z.string()
    .trim()
    .email('כתובת מייל לא תקינה')
    .max(255, 'כתובת מייל ארוכה מדי'),
  password: z.string()
    .min(8, 'הסיסמה חייבת להיות לפחות 8 תווים')
    .regex(/[A-Z]/, 'הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית')
    .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת')
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    level: '',
    parentEmail: '',
    email: '',
    password: ''
  });

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
            password: formData.password 
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
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: formData.name,
              grade: parseInt(formData.grade),
              english_level: formData.level,
              parent_email: formData.parentEmail,
            }
          }
        });

        if (error) throw error;

        toast({
          title: "ההרשמה הצליחה!",
          description: "ברוכים הבאים למסע הלמידה שלכם!",
        });
        
        const ageGroup = 
          parseInt(formData.grade) <= 3 ? 'young' :
          parseInt(formData.grade) <= 6 ? 'middle' : 'high';
        localStorage.setItem('ageGroup', ageGroup);
        
        navigate('/dashboard');
      } catch (error: any) {
        toast({
          title: "ההרשמה נכשלה",
          description: "אנא נסו שוב או פנו לתמיכה",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.name.length > 0;
      case 2: return formData.grade.length > 0;
      case 3: return formData.level.length > 0;
      case 4: return formData.parentEmail.length > 0;
      case 5: return formData.email.length > 0 && formData.password.length >= 6;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bounce-in">
        <div className="flex items-center justify-center mb-8">
          <Sparkles className="w-8 h-8 text-primary ml-2" />
          <h1 className="text-2xl font-bold">בואו נכיר!</h1>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
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
                    setValidationErrors({ ...validationErrors, name: '' });
                  }}
                  className="text-lg"
                  autoFocus
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>
                )}
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
                        כיתה {grade}
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
                  { value: 'beginner', label: 'מתחיל - רק מתחיל ללמוד', icon: '🌱' },
                  { value: 'intermediate', label: 'בינוני - יודע בסיס', icon: '🌿' },
                  { value: 'advanced', label: 'מתקדם - טוב באנגלית', icon: '🌳' }
                ].map((level) => (
                  <Button
                    key={level.value}
                    variant={formData.level === level.value ? 'default' : 'outline'}
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
                    setValidationErrors({ ...validationErrors, parentEmail: '' });
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
              <div>
                <Label htmlFor="email">המייל שלך</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setValidationErrors({ ...validationErrors, email: '' });
                  }}
                  className="text-lg"
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
                  placeholder="לפחות 8 תווים, אות גדולה וספרה"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setValidationErrors({ ...validationErrors, password: '' });
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

          <Button
            className="w-full"
            size="lg"
            onClick={handleNext}
            disabled={!isStepValid() || isLoading}
          >
            {isLoading ? 'יוצר חשבון...' : (step === 5 ? 'בואו נתחיל ללמוד!' : 'המשך')}
            <ArrowRight className="mr-2" />
          </Button>

          {step > 1 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep(step - 1)}
              disabled={isLoading}
            >
              חזרה
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Register;
