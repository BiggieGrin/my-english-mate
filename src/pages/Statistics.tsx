import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Flame, TrendingUp, Brain, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

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

      // Generate mock daily study data for the last 7 days
      const mockDailyData = [
        { day: 'א׳', minutes: 15 },
        { day: 'ב׳', minutes: 25 },
        { day: 'ג׳', minutes: 20 },
        { day: 'ד׳', minutes: 30 },
        { day: 'ה׳', minutes: 18 },
        { day: 'ו׳', minutes: 35 },
        { day: 'ש׳', minutes: 22 }
      ];
      setDailyStudyData(mockDailyData);

      // Generate AI-based strengths assessment
      const mockStrengthsData = [
        { skill: 'אוצר מילים', score: 85 },
        { skill: 'דקדוק', score: 70 },
        { skill: 'הבנת הנקרא', score: 90 },
        { skill: 'כתיבה', score: 65 },
        { skill: 'שיחה', score: 75 }
      ];
      setStrengthsData(mockStrengthsData);

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
              <TrendingUp className="w-6 h-6 text-primary" />
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

          {/* Streak Progress */}
          <Card className="p-6 shadow-md border-accent/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Flame className="w-5 h-5 text-accent" />
              מגמת רצף למידה
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={[
                { week: 'שבוע 1', streak: 2 },
                { week: 'שבוע 2', streak: 4 },
                { week: 'שבוע 3', streak: 3 },
                { week: 'שבוע 4', streak: profile.current_streak }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="streak" stroke="hsl(var(--accent))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
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
