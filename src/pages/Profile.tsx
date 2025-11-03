import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, GraduationCap, Award, Settings, LogOut, Star, TrendingUp, Trophy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AgeGroup = 'young' | 'middle' | 'high';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('middle');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    full_name: '',
    parent_email: '',
    grade: 0
  });

  useEffect(() => {
    fetchProfile();
    const group = localStorage.getItem('ageGroup') as AgeGroup;
    if (group) {
      setAgeGroup(group);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setEditForm({
        full_name: data.full_name,
        parent_email: data.parent_email,
        grade: data.grade
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הפרופיל",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          parent_email: editForm.parent_email,
          grade: editForm.grade
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      toast({
        title: "הצלחה",
        description: "הפרופיל עודכן בהצלחה"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הפרופיל",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg shadow-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-7 h-7 text-primary" />
              הפרופיל שלי
            </h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowRight className="ml-2" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Profile Hero Card */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-primary/20 shadow-xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-6xl shadow-2xl border-4 border-white">
                {ageGroup === 'young' ? '🎈' : ageGroup === 'middle' ? '🎓' : '🎯'}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-warning text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg border-2 border-white">
                {profile.level}
              </div>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {profile.full_name}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                כיתה {profile.grade} | {profile.english_level}
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <span className="font-bold">{profile.total_points}</span>
                  <span className="text-sm text-muted-foreground">נקודות</span>
                </div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-bold">{profile.current_streak}</span>
                  <span className="text-sm text-muted-foreground">ימים רצופים</span>
                </div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  <span className="font-bold">{profile.lessons_completed}</span>
                  <span className="text-sm text-muted-foreground">שיעורים</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                מידע אישי
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    handleSaveProfile();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing ? 'שמור' : 'ערוך'}
              </Button>
            </div>
            <Separator className="mb-6" />
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  שם מלא
                </Label>
                <Input 
                  id="name" 
                  value={editForm.full_name} 
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  disabled={!isEditing}
                  className="text-lg"
                />
              </div>
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  אימייל הורה
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={editForm.parent_email} 
                  onChange={(e) => setEditForm({...editForm, parent_email: e.target.value})}
                  disabled={!isEditing}
                  className="text-lg"
                />
              </div>
              <div>
                <Label htmlFor="grade" className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4" />
                  כיתה
                </Label>
                <Input 
                  id="grade" 
                  type="number"
                  value={editForm.grade} 
                  onChange={(e) => setEditForm({...editForm, grade: parseInt(e.target.value) || 0})}
                  disabled={!isEditing}
                  className="text-lg"
                />
              </div>
            </div>
          </Card>

          {/* Learning Stats */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              סטטיסטיקות למידה
            </h3>
            <Separator className="mb-6" />
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">רמה נוכחית</p>
                    <p className="text-2xl font-bold text-primary">{profile.level}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/5 to-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-warning fill-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">סה"כ נקודות</p>
                    <p className="text-2xl font-bold text-warning">{profile.total_points}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success/5 to-success/10 rounded-lg border border-success/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">רצף ימי לימוד</p>
                    <p className="text-2xl font-bold text-success">{profile.current_streak} ימים</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-bold mb-6">פעולות נוספות</h3>
          <Separator className="mb-6" />
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => navigate('/achievements')} className="flex-1 min-w-[200px]">
              <Trophy className="ml-2 w-5 h-5" />
              צפה בהישגים
            </Button>
            <Button onClick={() => navigate('/parent')} variant="outline" className="flex-1 min-w-[200px]">
              <User className="ml-2 w-5 h-5" />
              דף הורים
            </Button>
            <Button 
              onClick={() => {
                localStorage.clear();
                navigate('/');
              }} 
              variant="destructive" 
              className="flex-1 min-w-[200px]"
            >
              <LogOut className="ml-2 w-5 h-5" />
              התנתק
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
