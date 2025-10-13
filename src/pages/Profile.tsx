import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, GraduationCap, Award, Settings, LogOut, Star, TrendingUp, Trophy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type AgeGroup = 'young' | 'middle' | 'high';

const Profile = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('middle');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('studentData');
    const group = localStorage.getItem('ageGroup') as AgeGroup;
    if (data) {
      setStudentData(JSON.parse(data));
    }
    if (group) {
      setAgeGroup(group);
    }
  }, []);

  const stats = {
    totalPoints: 1250,
    level: 5,
    lessonsCompleted: 23,
    averageScore: 87,
    streak: 7
  };

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
                {stats.level}
              </div>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {studentData?.name || 'תלמיד'}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                {studentData?.grade ? `כיתה ${studentData.grade}` : 'כיתה ד׳'} | {studentData?.level || 'מתחיל'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <span className="font-bold">{stats.totalPoints}</span>
                  <span className="text-sm text-muted-foreground">נקודות</span>
                </div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-bold">{stats.streak}</span>
                  <span className="text-sm text-muted-foreground">ימים רצופים</span>
                </div>
                <div className="bg-white/80 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  <span className="font-bold">{stats.lessonsCompleted}</span>
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
                onClick={() => setIsEditing(!isEditing)}
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
                  value={studentData?.name || ''} 
                  disabled={!isEditing}
                  className="text-lg"
                />
              </div>
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  אימייל
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={studentData?.email || 'student@example.com'} 
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
                  value={studentData?.grade ? `כיתה ${studentData.grade}` : 'כיתה ד׳'} 
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
                    <p className="text-2xl font-bold text-primary">{stats.level}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ממוצע ציונים</p>
                    <p className="text-2xl font-bold text-accent">{stats.averageScore}%</p>
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
                    <p className="text-2xl font-bold text-warning">{stats.totalPoints}</p>
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
                    <p className="text-2xl font-bold text-success">{stats.streak} ימים</p>
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
