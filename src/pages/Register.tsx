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

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    level: '',
    parentEmail: '',
    email: '',
    password: ''
  });

  const handleNext = async () => {
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
          title: "Registration successful!",
          description: "Welcome to your learning journey!",
        });
        
        const ageGroup = 
          parseInt(formData.grade) <= 3 ? 'young' :
          parseInt(formData.grade) <= 6 ? 'middle' : 'high';
        localStorage.setItem('ageGroup', ageGroup);
        
        navigate('/dashboard');
      } catch (error: any) {
        toast({
          title: "Registration failed",
          description: error.message,
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-lg"
                  autoFocus
                />
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
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="text-lg"
                  dir="ltr"
                />
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="text-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="לפחות 6 תווים"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="text-lg"
                  dir="ltr"
                />
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
