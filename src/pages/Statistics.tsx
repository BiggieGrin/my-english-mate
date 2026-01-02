import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageContainer, PageHeader } from "@/components/layout";
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
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/store/api/profileApi";
import { useGetMessagesByUserQuery } from "@/store/api/messagesApi";

const Statistics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailyStudyData, setDailyStudyData] = useState<any[]>([]);
  const [strengthsData, setStrengthsData] = useState<any[]>([]);
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  // RTK Query hooks
  const { data: user } = useGetUserQuery();
  const userId = user?.id || "";

  const { data: profile, isLoading: profileLoading } = useGetProfileQuery(
    userId,
    {
      skip: !userId,
    }
  );

  const [updateProfile] = useUpdateProfileMutation();

  const { data: messages = [] } = useGetMessagesByUserQuery(
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

  const calculateStatistics = async () => {
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

    // Calculate day streak based on incremental logic
    const { newStreak, shouldUpdate } = calculateDayStreak();
    setCurrentStreak(newStreak);

    // Update profile if streak changed
    if (shouldUpdate) {
      const todayStr = new Date().toISOString().split("T")[0];
      await updateProfile({
        userId,
        updates: {
          current_streak: newStreak,
          last_chat_date: todayStr,
        },
      });
    }

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

  const calculateDayStreak = () => {
    const currentStreak = profile?.current_streak || 0;
    const lastChatDate = profile?.last_chat_date;

    if (!messages || messages.length === 0) {
      return { newStreak: currentStreak, shouldUpdate: false };
    }

    // Get today's date (normalized to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Get yesterday's date
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Check if there are any messages from today
    const hasMessagesToday = messages.some((msg) => {
      const msgDate = new Date(msg.created_at);
      msgDate.setHours(0, 0, 0, 0);
      return msgDate.toISOString().split("T")[0] === todayStr;
    });

    // If no messages today, keep current streak (don't break it yet)
    if (!hasMessagesToday) {
      // Check if last chat was yesterday - if so, streak is still valid
      // If last chat was 2+ days ago, reset streak
      if (lastChatDate) {
        const lastDate = new Date(lastChatDate);
        const daysDiff = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > 1) {
          // More than 1 day gap, reset streak
          return { newStreak: 0, shouldUpdate: true };
        }
      }
      return { newStreak: currentStreak, shouldUpdate: false };
    }

    // User has messages today
    // If last_chat_date is already today, don't increment (already counted)
    if (lastChatDate === todayStr) {
      return { newStreak: currentStreak, shouldUpdate: false };
    }

    // If last chat was yesterday, increment streak
    if (lastChatDate === yesterdayStr) {
      return { newStreak: currentStreak + 1, shouldUpdate: true };
    }

    // If last chat was more than 1 day ago (or never), reset to 1
    if (!lastChatDate) {
      return { newStreak: 1, shouldUpdate: true };
    }

    const lastDate = new Date(lastChatDate);
    const daysDiff = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 1) {
      // Gap in streak, reset to 1 (today is day 1)
      return { newStreak: 1, shouldUpdate: true };
    }

    // Fallback
    return { newStreak: currentStreak, shouldUpdate: false };
  };

  const loading = profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Calculate total study time from messages (approximately 1 message = 1 minute)
  const totalStudyMinutes = messages.length;

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <PageHeader
          title="סטטיסטיקות"
          subtitle="מעקב אחר ההתקדמות שלך"
          breadcrumbs={[
            { label: "דף הבית", href: "/dashboard" },
            { label: "סטטיסטיקות" },
          ]}
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 card-bordered elevation-1">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-foreground">{currentStreak}</div>
                <div className="text-sm text-muted-foreground mt-1">רצף ימים</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 card-bordered elevation-1">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-foreground">{totalStudyMinutes}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  סה"כ דקות למידה
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Study Time */}
          <Card className="p-6 card-bordered elevation-1">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              זמן למידה יומי
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyStudyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Skills Radar */}
          <Card className="p-6 card-bordered elevation-1">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
              <Brain className="w-5 h-5 text-primary" />
              נקודות חוזק
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={strengthsData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="skill" className="text-xs" stroke="hsl(var(--foreground))" />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <Radar
                  name="ציון"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* AI Assessment */}
        {aiAssessment && (
          <Card className="p-6 card-bordered elevation-1">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Brain className="w-5 h-5 text-primary" />
              הערכת AI
            </h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-base text-muted-foreground whitespace-pre-wrap">
                {typeof aiAssessment === "string"
                  ? aiAssessment
                  : JSON.stringify(aiAssessment, null, 2)}
              </p>
            </div>
          </Card>
        )}
      </PageContainer>
    </div>
  );
};

export default Statistics;
