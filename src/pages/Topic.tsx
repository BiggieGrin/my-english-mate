import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Home,
  Brain,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  ClipboardList,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useProgressTracking } from "@/hooks/useProgressTracking";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
  messageCount: number;
}

interface Topic {
  id: string;
  title: string;
  icon: string;
  description: string | null;
}

const Topic = () => {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const { toast } = useToast();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get active conversation for progress tracking
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchActiveConversation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !topicId) return;

      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveConversationId(data.id);
      }
    };

    fetchActiveConversation();
  }, [topicId]);

  const { progress, isLoading: progressLoading } = useProgressTracking(activeConversationId);

  // Get completed sessions count for stats
  const [completedStats, setCompletedStats] = useState({ lessons: 0, homework: 0, tests: 0 });
  
  useEffect(() => {
    const fetchCompletedStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !topicId) return;

      const { data } = await supabase
        .from('lesson_sessions')
        .select('mode')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .not('completed_at', 'is', null);

      if (data) {
        const stats = {
          lessons: data.filter(s => s.mode === 'learn').length,
          homework: data.filter(s => s.mode === 'homework').length,
          tests: data.filter(s => s.mode === 'exam_prep').length,
        };
        setCompletedStats(stats);
      }
    };

    fetchCompletedStats();
  }, [topicId]);

  useEffect(() => {
    loadTopicAndConversations();
  }, [topicId]);

  const loadTopicAndConversations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load topic details from curriculum_topics
      const { data: topicData, error: topicError } = await supabase
        .from("curriculum_topics")
        .select("*")
        .eq("id", topicId)
        .single();

      if (topicError) throw topicError;

      // Verify user is enrolled in this topic
      const { data: enrollment } = await supabase
        .from("user_topics")
        .select("*")
        .eq("user_id", user.id)
        .eq("topic_id", topicId)
        .single();

      if (!enrollment) {
        toast({
          title: "שגיאה",
          description: "אינך רשום לנושא זה.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setTopic(topicData);

      // Load conversations for this topic
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      // For each conversation, count messages
      const conversationsWithCount = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { count } = await supabase
            .from("lesson_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id);

          return {
            ...conv,
            messageCount: count || 0,
          };
        }),
      );

      setConversations(conversationsWithCount);
    } catch (error) {
      console.error("Error loading topic and conversations:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הנתונים.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewConversation = async (mode: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !topic) return;

      // Create a new conversation
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          topic_id: topic.id,
          title: `${mode} - ${topic.title}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the lesson page with the conversation ID
      navigate(`/lesson/${conversation.id}`, {
        state: {
          topic: topic.title,
          topicId: topic.id,
          mode: mode,
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור שיחה חדשה.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">הנושא לא נמצא</h2>
          <Button onClick={() => navigate("/dashboard")}>חזרה ללוח הבית</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            חזרה
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Icon with decorative circles */}
          <div className="flex justify-center mb-6 sm:mb-8 relative">
            <div className="absolute top-4 left-1/2 -translate-x-20 w-12 h-12 rounded-full bg-blue-100 opacity-50"></div>
            <div className="absolute top-8 right-1/2 translate-x-16 w-8 h-8 rounded-full bg-blue-200 opacity-40"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-5xl sm:text-6xl">{topic.icon}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 break-words px-4">{topic.title}</h1>
          {topic.description && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">{topic.description}</p>
          )}
        </div>

        {/* Progress Section - SINGLE PROGRESS BAR ONLY */}
        <div className="max-w-5xl mx-auto mb-12 sm:mb-16">
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">התקדמות שיעור נוכחי</span>
                  <span className="text-sm font-bold">
                    {progress?.sessionProgress.toFixed(progress.sessionProgress % 1 === 0 ? 0 : 1)}%
                  </span>
                </div>
                <Progress value={progress?.sessionProgress || 0} className="h-3" />
              </div>

              <div className="text-xs text-muted-foreground text-center">
                {progress ? (
                  <>
                    {progress.questionsAnswered} שאלות נענו • {progress.correctAnswers} נכונות
                  </>
                ) : (
                  'התחל שיעור כדי לעקוב אחר ההתקדמות'
                )}
              </div>
            </div>

            {/* Stats Pills */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{completedStats.lessons}</div>
                <div className="text-xs text-muted-foreground mt-1">שיעורים הושלמו</div>
              </div>
              <div className="bg-secondary/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-secondary-foreground">{completedStats.homework}</div>
                <div className="text-xs text-muted-foreground mt-1">שיעורי בית הושלמו</div>
              </div>
              <div className="bg-accent/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent-foreground">{completedStats.tests}</div>
                <div className="text-xs text-muted-foreground mt-1">מבחנים הושלמו</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="space-y-4 sm:space-y-6 mb-12 sm:mb-16 max-w-5xl mx-auto">
          {/* Learn Topic Card */}
          <Card className="border-2 border-blue-200 rounded-3xl overflow-hidden hover:border-blue-400 transition-colors">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">ללמוד את הנושא</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">הסבר מפורט עם דוגמאות - 20 דקות</p>
                </div>
              </div>
              <Button
                onClick={() => handleStartNewConversation("ללמוד את הנושא")}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                התחל ללמוד
              </Button>
            </div>
          </Card>

          {/* Homework Card */}
          <Card className="border-2 border-blue-200 rounded-3xl overflow-hidden hover:border-blue-400 transition-colors">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Home className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">שיעורי בית</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">תרגול מעשי של הזמן - 15 דקות</p>
                </div>
              </div>
              <Button
                onClick={() => handleStartNewConversation("שיעורי בית")}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                התחל עכשיו
              </Button>
            </div>
          </Card>

          {/* Test Prep Card */}
          <Card className="border-2 border-blue-200 rounded-3xl overflow-hidden hover:border-blue-400 transition-colors">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">הכנה למבחן</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">בדיקת מוכנות ותרגול - 10 דקות</p>
                </div>
              </div>
              <Button
                onClick={() => handleStartNewConversation("הכנה למבחן")}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                התחל הכנה
              </Button>
            </div>
          </Card>
        </div>

        {/* Previous Conversations */}
        {conversations.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-right">שיחות קודמות</h2>

            <div className="space-y-3 sm:space-y-4">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className="border-2 border-border rounded-2xl overflow-hidden hover:border-blue-300 transition-all hover:shadow-md cursor-pointer"
                  onClick={() =>
                    navigate(`/lesson/${conversation.id}`, {
                      state: {
                        topic: topic.title,
                        topicId: topic.id,
                        conversationId: conversation.id,
                      },
                    })
                  }
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">
                          {conversation.title || "שיחה ללא כותרת"}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                          <span>{format(new Date(conversation.last_message_at), "dd/MM/yyyy")}</span>
                          <span>•</span>
                          <span>הודעות {conversation.messageCount}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topic;
