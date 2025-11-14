import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, GraduationCap, Settings, LogOut, BarChart3, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { XpProgressBar } from '@/components/XpProgressBar';
import { formatGrade } from '@/lib/gradeUtils';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    full_name: '',
    parent_email: '',
    grade: 0
  });

  useEffect(() => {
    fetchProfile();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const calculateRequiredXp = (level: number) => level * 100;
  const requiredXp = calculateRequiredXp(profile?.level || 1);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <User className="w-6 h-6 text-primary" />
              הפרופיל שלי
            </h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowRight className="ml-2 w-4 h-4" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Card */}
        <div className="max-w-4xl mx-auto">
        <Card className="mb-6 overflow-hidden border-primary/20 shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-1">{profile.full_name}</h2>
                <p className="text-muted-foreground">כיתה {formatGrade(profile.grade)}</p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">רמה {profile.level}</span>
                <span className="text-muted-foreground">{profile.current_xp} / {requiredXp} XP</span>
              </div>
              <XpProgressBar 
                currentXp={profile.current_xp} 
                requiredXp={requiredXp} 
                level={profile.level} 
              />
            </div>
          </div>
        </Card>
          {/* Personal Info Card */}
          <Card className="p-6 shadow-md border-primary/10 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Settings className="w-5 h-5 text-primary" />
                פרטים אישיים
              </h3>
              {!isEditing ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSaveProfile}>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="full_name" className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      שם מלא
                    </Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent_email" className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4" />
                      אימייל הורה
                    </Label>
                    <Input
                      id="parent_email"
                      type="email"
                      value={editForm.parent_email}
                      onChange={(e) => setEditForm({ ...editForm, parent_email: e.target.value })}
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
                      onChange={(e) => setEditForm({ ...editForm, grade: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">שם מלא</p>
                      <p className="font-medium">{profile.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">אימייל הורה</p>
                      <p className="font-medium">{profile.parent_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">כיתה</p>
                    <p className="font-medium">{formatGrade(profile.grade)}</p>
                  </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Logout Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="ml-2 w-5 h-5" />
              התנתק
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
