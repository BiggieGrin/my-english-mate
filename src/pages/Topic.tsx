import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Home, Brain, ArrowRight, MessageSquare, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="ml-2" />
            חזרה ללוח הבית
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Topic Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="text-7xl">{topic.icon}</div>
          </div>
          <h1 className="text-4xl font-bold mb-3">{topic.title}</h1>
          {topic.description && <p className="text-lg text-muted-foreground mb-8">{topic.description}</p>}

          {/* Progress Info */}
          <div className="max-w-3xl mx-auto bg-slate-100 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">סה"כ שיחות: {conversations.length}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-base border-blue-200 hover:text-primary hover:bg-blue-50"
            onClick={() => handleStartNewConversation("הכנה למבחן")}
          >
            <Brain className="ml-2 w-5 h-5" />
            הכנה למבחן
          </Button>
          <Button
            size="lg"
            className="h-16 text-base bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => handleStartNewConversation("שיעורי בית")}
          >
            <Home className="ml-2 w-5 h-5" />
            שיעורי בית
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-base border-blue-200 hover:text-primary hover:bg-blue-50"
            onClick={() => handleStartNewConversation("ללמוד את הנושא")}
          >
            <BookOpen className="ml-2 w-5 h-5" />
            ללמוד את הנושא
          </Button>
        </div>

        {/* Conversations List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-right">שיחות קודמות</h2>

          {conversations.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">עדיין אין שיחות בנושא זה</p>
              <p className="text-sm text-muted-foreground mt-2">התחל שיחה חדשה כדי להתחיל ללמוד!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className="transition-all duration-300 hover:-translate-x-2 hover:border-blue-500 cursor-pointer pointer-events-none"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <MessageSquare className="w-10 h-10 text-blue-500" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{conversation.title || "שיחה ללא כותרת"}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {conversation.messageCount} הודעות
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(conversation.last_message_at), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="default"
                        className="bg-blue-500 hover:bg-blue-600 text-white pointer-events-auto"
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
                        פתח שיחה
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topic;
