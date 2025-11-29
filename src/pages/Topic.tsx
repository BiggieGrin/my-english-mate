import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Home, Brain, ArrowRight, MessageSquare, Clock, CheckCircle2, ClipboardList, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

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

  // Calculate mock progress data
  const totalConversations = conversations.length;
  const mockProgress = Math.min((totalConversations / 5) * 100, 100); // Example: 5 conversations = 100%
  const lessonsCount = conversations.filter(c => c.title?.includes("ללמוד")).length;
  const homeworkCount = conversations.filter(c => c.title?.includes("שיעורי בית")).length;
  const testsCount = conversations.filter(c => c.title?.includes("מבחן")).length;

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
            חזרה ללובי הבית
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
              <svg className="w-14 h-14 sm:w-16 sm:h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 break-words px-4">{topic.title}</h1>
          {topic.description && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">{topic.description}</p>
          )}
        </div>

        {/* Progress Section */}
        <div className="max-w-5xl mx-auto mb-12 sm:mb-16">
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm sm:text-base text-muted-foreground">התקדמות שלך</span>
              <span className="text-sm sm:text-base font-semibold text-blue-600">{Math.round(mockProgress)}%</span>
            </div>
            <Progress value={mockProgress} className="h-2 mb-8" />
            
            {/* Stats Pills */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="flex flex-col items-center gap-2 bg-blue-50 rounded-2xl p-3 sm:p-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{lessonsCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">שיעורים</div>
              </div>
              <div className="flex flex-col items-center gap-2 bg-green-50 rounded-2xl p-3 sm:p-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{homeworkCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">תרגילים</div>
              </div>
              <div className="flex flex-col items-center gap-2 bg-purple-50 rounded-2xl p-3 sm:p-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{testsCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">מבחנים</div>
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
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                className="text-blue-600 hover:text-blue-700"
                onClick={() => {/* Could implement "view all" functionality */}}
              >
                צפה בכל השיחות
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topic;
