import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Flame, Brain, Target, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dailyStudyData, setDailyStudyData] = useState<any[]>([]);
  const [strengthsData, setStrengthsData] = useState<any[]>([]);
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (error) throw error;
      setProfile(profileData);

      // Calculate real daily study data from lesson_messages
      const today = new Date();
      const dailyData: { [key: number]: number } = {};

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { data: messages } = await supabase
          .from("lesson_messages")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDate.toISOString());

        // Each message represents approximately 1 minute of study
        const minutes = messages ? messages.length : 0;
        const dayIndex = date.getDay();

        dailyData[dayIndex] = (dailyData[dayIndex] || 0) + minutes;
      }

      // Order: Sunday (0) ... Friday (5) ... Saturday (6) - so Saturday is far right
      const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
      const orderedDays = [0, 1, 2, 3, 4, 5, 6]; // Sunday on the left, Saturday on the right

      const last7Days = orderedDays.map((dayIndex) => ({
        day: hebrewDays[dayIndex],
        minutes: dailyData[dayIndex] || 0,
      }));

      setDailyStudyData(last7Days);

      // Skills will be calculated by AI assessment based on actual conversations
      // Default values in case AI assessment is not available yet
      const defaultStrengthsData = [
        { skill: "אוצר מילים", score: 50 },
        { skill: "דקדוק", score: 50 },
        { skill: "הבנת הנקרא", score: 50 },
        { skill: "כתיבה", score: 50 },
        { skill: "שיחה", score: 50 },
      ];
      setStrengthsData(defaultStrengthsData);

      // Fetch AI assessment
      await fetchAIAssessment(user.id, profileData, defaultStrengthsData, last7Days);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הסטטיסטיקות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAssessment = async (userId: string, profile: any, strengthsData: any[], dailyStudyData: any[]) => {
    setAssessmentLoading(true);
    try {
      // Get recent lesson messages for context
      const { data: recentMessages } = await supabase
        .from("lesson_messages")
        .select("content, role, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data, error } = await supabase.functions.invoke("ai-assessment", {
        body: {
          profile,
          strengthsData,
          dailyStudyData,
          recentMessages: recentMessages || [],
        },
      });

      if (error) throw error;

      const assessment = data as any;
      setAiAssessment(assessment);

      // Update skills data from AI assessment
      if (assessment.skills) {
        const skillsData = [
          { skill: "אוצר מילים", score: assessment.skills.vocabulary },
          { skill: "דקדוק", score: assessment.skills.grammar },
          { skill: "הבנת הנקרא", score: assessment.skills.reading },
          { skill: "כתיבה", score: assessment.skills.writing },
          { skill: "שיחה", score: assessment.skills.speaking },
        ];
        setStrengthsData(skillsData);
      }
    } catch (error) {
      console.error("Error fetching AI assessment:", error);
      // Fallback to basic assessment
      setAiAssessment({
        trend: "לא ניתן לנתח כרגע",
        strengths: ["המשך ללמוד"],
        improvements: ["תרגל באופן קבוע"],
        hasEnoughData: false,
        skills: {
          vocabulary: 50,
          grammar: 50,
          reading: 50,
          writing: 50,
          speaking: 50,
        },
      });
    } finally {
      setAssessmentLoading(false);
    }
  };

  const calculateAverageStudyTime = () => {
    const total = dailyStudyData.reduce((sum, day) => sum + day.minutes, 0);
    return Math.round(total / dailyStudyData.length);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  }

  if (!profile) {
    return null;
  }

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={dailyStudyData}
                margin={{ top: 20, right: 24, left: 24, bottom: 36 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  interval={0}
                  tick={{ fontSize: 13 }}
                  tickMargin={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickMargin={24}
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
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
              <div className="relative w-32 h-32 mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
                  <span className="text-5xl font-bold text-accent">{profile.current_streak}</span>
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">ימי למידה רצופים</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {profile.current_streak >= 5
                  ? "מדהים! המשך כך! 🔥"
                  : profile.current_streak >= 3
                    ? "כל הכבוד! המשך לתרגל 💪"
                    : ""}
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
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={420}>
              <RadarChart
                data={strengthsData}
                outerRadius="60%" // Reduce this to make more room
                margin={{ top: 60, right: 100, bottom: 60, left: 100 }} // Increase margins
              >
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="skill"
                  stroke="hsl(var(--foreground))"
                  tick={{ fontSize: 13, fill: "hsl(var(--foreground))" }}
                  tickMargin={40} // Increase this
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickMargin={8}
                />
                <Radar
                  name="ציון"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Assessment */}
        <Card className="p-6 shadow-lg border-primary/20 bg-gradient-to-br from-card via-primary/5 to-accent/5">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <Brain className="w-6 h-6 text-primary" />
            הערכת AI - ניתוח התקדמות
          </h3>

          {assessmentLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mr-3 text-muted-foreground">מנתח את הנתונים שלך...</p>
            </div>
          ) : aiAssessment ? (
            <div className="space-y-4">
              {!aiAssessment.hasEnoughData && (
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20 mb-4">
                  <p className="text-sm text-foreground">💡 המשך ללמוד כדי לקבל הערכה מפורטת יותר מה-AI</p>
                </div>
              )}

              {/* Trend */}
              <div className="p-4 bg-card rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground mb-1">מגמת התקדמות</p>
                <p className="text-lg font-semibold text-foreground">{aiAssessment.trend}</p>
              </div>

              {/* Strengths */}
              <div className="p-4 bg-card rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground mb-2">נקודות חוזקה 💪</p>
                <div className="flex flex-wrap gap-2">
                  {aiAssessment.strengths.map((strength: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div className="p-4 bg-card rounded-lg border border-accent/10">
                <p className="text-sm text-muted-foreground mb-2">תחומים לשיפור 🎯</p>
                <div className="flex flex-wrap gap-2">
                  {aiAssessment.improvements.map((area: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">לא ניתן לטעון הערכה כרגע</div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
