import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Home,
  Brain,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useGetUserQuery } from "@/store/api/authApi";
import { useGetCurriculumTopicByIdQuery, useGetUserTopicByTopicIdQuery } from "@/store/api/topicsApi";
import { useGetConversationsQuery, useCreateConversationMutation } from "@/store/api/conversationsApi";

const Topic = () => {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const { toast } = useToast();

  // RTK Query hooks
  const { data: user } = useGetUserQuery();
  const userId = user?.id || '';

  const {
    data: topic,
    isLoading: isTopicLoading,
  } = useGetCurriculumTopicByIdQuery(topicId || '', {
    skip: !topicId,
  });

  const {
    data: enrollment,
    isLoading: isEnrollmentLoading,
  } = useGetUserTopicByTopicIdQuery(
    { userId, topicId: topicId || '' },
    { skip: !userId || !topicId }
  );

  const {
    data: conversationsData = [],
    isLoading: isConversationsLoading,
  } = useGetConversationsQuery(
    { userId, topicId },
    { skip: !userId || !topicId }
  );

  const [createConversation] = useCreateConversationMutation();

  // Check enrollment
  if (!isEnrollmentLoading && !enrollment && userId) {
    toast({
      title: "שגיאה",
      description: "אינך רשום לנושא זה.",
      variant: "destructive",
    });
    navigate("/dashboard");
    return null;
  }

  const handleStartNewConversation = async (mode: string) => {
    try {
      console.log('[Topic] Starting new conversation', { userId, topicId: topic?.id, mode });

      if (!userId || !topic) {
        console.error('[Topic] Missing userId or topic', { userId, topic });
        toast({
          title: "שגיאה",
          description: "לא נמצא מידע על המשתמש או הנושא.",
          variant: "destructive",
        });
        return;
      }

      // Create a new conversation
      console.log('[Topic] Creating conversation...');
      const result = await createConversation({
        userId,
        topicId: topic.id,
        title: `${mode} - ${topic.title}`,
        mode: mode,
      }).unwrap();

      console.log('[Topic] Conversation mutation result:', result);

      // Handle array response (RTK Query might return an array)
      const conversation = Array.isArray(result) ? result[0] : result;

      console.log('[Topic] Extracted conversation:', conversation);

      if (!conversation || !conversation.id) {
        console.error('[Topic] Invalid conversation returned:', conversation);
        toast({
          title: "שגיאה",
          description: "לא הצלחנו ליצור שיחה חדשה.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the lesson page with the conversation ID
      console.log('[Topic] Navigating to lesson:', `/lesson/${conversation.id}`);
      navigate(`/lesson/${conversation.id}`, {
        state: {
          topic: topic.title,
          topicId: topic.id,
          mode: mode,
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error("[Topic] Error creating conversation:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור שיחה חדשה.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isTopicLoading || isEnrollmentLoading || isConversationsLoading;

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
                onClick={() => handleStartNewConversation("לימוד")}
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
        {conversationsData.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-right">שיחות קודמות</h2>

            <div className="space-y-3 sm:space-y-4">
              {conversationsData.map((conversation) => (
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
