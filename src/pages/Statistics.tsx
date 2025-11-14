import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Flame, Brain, Target, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dailyStudyData, setDailyStudyData] = useState<any[]>([]);
  const [strengthsData, setStrengthsData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);

      // Calculate real daily study data from lesson_messages
      const today = new Date();
      const last7Days = [];
      const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const { data: messages } = await supabase
          .from('lesson_messages')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());
        
        // Each message represents approximately 1 minute of study
        const minutes = messages ? messages.length : 0;
        
        last7Days.push({
          day: dayNames[date.getDay()],
          minutes: minutes
        });
      }
      
      setDailyStudyData(last7Days);

      // Calculate strengths based on actual performance
      // For now, we'll use lesson completion and XP as indicators
      const lessonsCompleted = profileData.lessons_completed || 0;
      const totalPoints = profileData.total_points || 0;
      const currentLevel = profileData.level || 1;
      
      // Calculate skill scores based on activity
      const vocabScore = Math.min(85, 50 + (lessonsCompleted * 2));
      const grammarScore = Math.min(80, 40 + (currentLevel * 5));
      const readingScore = Math.min(90, 60 + (totalPoints / 50));
      const writingScore = Math.min(75, 45 + (lessonsCompleted * 1.5));
      const speakingScore = Math.min(80, 50 + (currentLevel * 4));
      
      const realStrengthsData = [
        { skill: 'אוצר מילים', score: Math.round(vocabScore) },
        { skill: 'דקדוק', score: Math.round(grammarScore) },
        { skill: 'הבנת הנקרא', score: Math.round(readingScore) },
        { skill: 'כתיבה', score: Math.round(writingScore) },
        { skill: 'שיחה', score: Math.round(speakingScore) }
      ];
      setStrengthsData(realStrengthsData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הסטטיסטיקות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageStudyTime = () => {
    const total = dailyStudyData.reduce((sum, day) => sum + day.minutes, 0);
    return Math.round(total / dailyStudyData.length);
  };

  const getAIAssessment = () => {
    if (!profile) return { strengths: [], improvements: [], trend: '' };

    const averageScore = strengthsData.reduce((sum, item) => sum + item.score, 0) / strengthsData.length;
    const topSkills = strengthsData.filter(s => s.score >= 80).map(s => s.skill);
    const improvementAreas = strengthsData.filter(s => s.score < 70).map(s => s.skill);

    return {
      strengths: topSkills.length > 0 ? topSkills : ['ממשיך להתקדם בכל התחומים'],
      improvements: improvementAreas.length > 0 ? improvementAreas : ['המשך לתרגל באופן עקבי'],
      trend: profile.current_streak >= 5 ? 'מצוין! 🔥' : profile.current_streak >= 3 ? 'התקדמות טובה 📈' : 'המשך לתרגל באופן קבוע 💪'
    };
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  }

  if (!profile) {
    return null;
  }

  const assessment = getAIAssessment();
  const avgStudyTime = calculateAverageStudyTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="w-6 h-6 text-primary" />
              סטטיסטיקות למידה
            </h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <ArrowRight className="ml-2 w-4 h-4" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 shadow-md border-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgStudyTime} דקות</p>
                <p className="text-sm text-muted-foreground">ממוצע יומי</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-md border-accent/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profile.current_streak} ימים</p>
                <p className="text-sm text-muted-foreground">רצף למידה</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-md border-secondary/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profile.lessons_completed}</p>
                <p className="text-sm text-muted-foreground">שיעורים הושלמו</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Daily Study Time Chart */}
          <Card className="p-6 shadow-md border-primary/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              זמן למידה יומי
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyStudyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Streak Information */}
          <Card className="p-6 shadow-md border-accent/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Flame className="w-5 h-5 text-accent" />
              רצף למידה
            </h3>
            <div className="flex flex-col items-center justify-center h-[250px]">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center mb-4">
                  <Flame className="w-16 h-16 text-accent" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-accent">{profile.current_streak}</span>
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground mt-4">ימי למידה רצופים</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {profile.current_streak >= 5 
                  ? 'מדהים! המשך כך! 🔥' 
                  : profile.current_streak >= 3 
                  ? 'כל הכבוד! המשך לתרגל 💪' 
                  : 'צור רצף למידה קבוע'}
              </p>
            </div>
          </Card>
        </div>

        {/* Skills Radar Chart */}
        <Card className="p-6 shadow-md border-primary/10 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" />
            פיזור מיומנויות
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={strengthsData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" stroke="hsl(var(--foreground))" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <Radar name="ציון" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* AI Assessment */}
        <Card className="p-6 shadow-lg border-primary/20 bg-gradient-to-br from-card via-primary/5 to-accent/5">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <Brain className="w-6 h-6 text-primary" />
            הערכת AI - ניתוח התקדמות
          </h3>

          <div className="space-y-4">
            {/* Trend */}
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm text-muted-foreground mb-1">מגמת התקדמות</p>
              <p className="text-lg font-semibold text-foreground">{assessment.trend}</p>
            </div>

            {/* Strengths */}
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm text-muted-foreground mb-2">נקודות חוזקה 💪</p>
              <div className="flex flex-wrap gap-2">
                {assessment.strengths.map((strength, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>

            {/* Improvements */}
            <div className="p-4 bg-card rounded-lg border border-accent/10">
              <p className="text-sm text-muted-foreground mb-2">תחומים לשיפור 🎯</p>
              <div className="flex flex-wrap gap-2">
                {assessment.improvements.map((area, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
