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
import { useGetUserQuery } from "@/store/api/authApi";
import { useGetProfileQuery } from "@/store/api/profileApi";
import { useGetMessagesByUserQuery } from "@/store/api/messagesApi";

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyStudyData, setDailyStudyData] = useState<any[]>([]);
  const [strengthsData, setStrengthsData] = useState<any[]>([]);
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  // RTK Query hooks
  const { data: user } = useGetUserQuery();
  const userId = user?.id || '';

  const {
    data: profile,
    isLoading: profileLoading,
  } = useGetProfileQuery(userId, {
    skip: !userId,
  });

  const {
    data: messages = [],
  } = useGetMessagesByUserQuery(
    { userId, limit: 1000 },
    { skip: !userId }
  );

  useEffect(() => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    if (profile && messages) {
      calculateStatistics();
    }
  }, [userId, profile, messages]);

  const calculateStatistics = () => {
    // Calculate real daily study data from lesson_messages - last 7 days chronologically
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Filter messages for this day
      const dayMessages = messages.filter((msg) => {
        const msgDate = new Date(msg.created_at);
        return msgDate >= date && msgDate < nextDate;
      });

      // Each message represents approximately 1 minute of study
      const minutes = dayMessages.length;
      const dayIndex = date.getDay();

      last7Days.push({
        day: hebrewDays[dayIndex],
        minutes: minutes,
      });
    }

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

    // Set AI assessment from profile
    if (profile?.ai_assessment) {
      setAiAssessment(profile.ai_assessment);
    }
  };

  const loading = profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Calculate total study time from messages (approximately 1 message = 1 minute)
  const totalStudyMinutes = messages.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card/80 backdrop-blur-lg shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="w-6 h-6 text-primary" />
              סטטיסטיקות
            </h1>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowRight className="ml-2 w-4 h-4" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{profile.current_streak || 0}</div>
                <div className="text-xs text-muted-foreground">רצף ימים</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalStudyMinutes}</div>
                <div className="text-xs text-muted-foreground">דקות למידה</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{profile.lessons_completed || 0}</div>
                <div className="text-xs text-muted-foreground">שיעורים הושלמו</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{profile.level || 1}</div>
                <div className="text-xs text-muted-foreground">רמה נוכחית</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Study Time */}
          <Card className="p-6 border-primary/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              זמן למידה יומי
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyStudyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Skills Radar */}
          <Card className="p-6 border-primary/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              נקודות חוזק
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={strengthsData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="skill" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                <Radar
                  name="ציון"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* AI Assessment */}
        {aiAssessment && (
          <Card className="p-6 border-primary/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              הערכת AI
            </h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {typeof aiAssessment === 'string' ? aiAssessment : JSON.stringify(aiAssessment, null, 2)}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Statistics;
