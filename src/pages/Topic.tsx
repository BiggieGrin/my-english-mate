import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Home,
  Brain,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useGetUserQuery } from "@/store/api/authApi";
import { useGetCurriculumTopicByIdQuery, useGetUserTopicByTopicIdQuery } from "@/store/api/topicsApi";
import { useGetConversationsQuery, useCreateConversationMutation } from "@/store/api/conversationsApi";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  hebrewForMode,
  LESSON_MODES,
  modeFromHebrew,
  type LessonMode,
} from "@/lib/lessonModes";

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

  const handleStartNewConversation = async (mode: LessonMode) => {
    try {

      if (!userId || !topic) {
        console.error('[Topic] Missing userId or topic', { userId, topic });
        toast({
          title: "שגיאה",
          description: "לא נמצא מידע על המשתמש או הנושא.",
          variant: "destructive",
        });
        return;
      }

      const result = await createConversation({
        userId,
        topicId: topic.id,
        title: `${LESSON_MODES[mode].label} - ${topic.title}`,
        mode: hebrewForMode(mode),
      }).unwrap();

      // Handle array response (RTK Query might return an array)
      const conversation = Array.isArray(result) ? result[0] : result;

      if (!conversation || !conversation.id) {
        toast({
          title: "שגיאה",
          description: "לא הצלחנו ליצור שיחה חדשה.",
          variant: "destructive",
        });
        return;
      }

      navigate(`/lesson/${conversation.id}/${mode}`, {
        state: {
          topic: topic.title,
          topicId: topic.id,
          mode,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
      <PageContainer>
        <PageHeader
          title={topic.title}
          subtitle={topic.description}
          breadcrumbs={[
            { label: "דף הבית", href: "/dashboard" },
            { label: topic.title },
          ]}
        />

        {/* Topic Icon Hero */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center elevation-3">
              <span className="text-6xl">{topic.icon}</span>
            </div>
          </div>
        </div>

        {/* Learning Mode Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            בחר מצב לימוד
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Learn Topic Card */}
            <Card className="card-bordered card-interactive cursor-pointer elevation-1" onClick={() => handleStartNewConversation("learn")}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 text-foreground">ללמוד את הנושא</h3>
                    <p className="text-sm text-muted-foreground">הסבר מפורט עם דוגמאות - 20 דקות</p>
                  </div>
                </div>
                <Button className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  התחל ללמוד
                </Button>
              </div>
            </Card>

            {/* Homework Card */}
            <Card className="card-bordered card-interactive cursor-pointer elevation-1" onClick={() => handleStartNewConversation("homework")}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Home className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 text-foreground">שיעורי בית</h3>
                    <p className="text-sm text-muted-foreground">תרגול מעשי של הזמן - 15 דקות</p>
                  </div>
                </div>
                <Button className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  התחל עכשיו
                </Button>
              </div>
            </Card>

            {/* Test Prep Card */}
            <Card className="card-bordered card-interactive cursor-pointer elevation-1" onClick={() => handleStartNewConversation("exam_prep")}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 text-foreground">הכנה למבחן</h3>
                    <p className="text-sm text-muted-foreground">בדיקת מוכנות ותרגול - 10 דקות</p>
                  </div>
                </div>
                <Button className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  התחל הכנה
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Previous Conversations */}
        {conversationsData.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-foreground">שיחות קודמות</h2>

            <div className="grid gap-3">
              {conversationsData.map((conversation) => (
                <Card
                  key={conversation.id}
                  className="card-bordered card-interactive cursor-pointer elevation-1"
                  onClick={() =>
                    navigate(
                      `/lesson/${conversation.id}/${modeFromHebrew(conversation.mode) ?? "learn"}`,
                      {
                        state: {
                          topic: topic.title,
                          topicId: topic.id,
                          mode: conversation.mode,
                          conversationId: conversation.id,
                        },
                      }
                    )
                  }
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 truncate text-foreground">
                          {conversation.title || "שיחה ללא כותרת"}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{format(new Date(conversation.last_message_at), "dd/MM/yyyy")}</span>
                        </div>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default Topic;
