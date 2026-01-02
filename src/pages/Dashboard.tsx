import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TopicOption } from "@/data/englishTopics";
import OnboardingModal from "@/components/OnboardingModal";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useGetUserQuery } from "@/store/api/authApi";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  useGetProfileQuery,
} from "@/store/api/profileApi";
import {
  useGetUserTopicsQuery,
  useGetCurriculumTopicsQuery,
  useEnrollInTopicMutation,
} from "@/store/api/topicsApi";
import {
  useGetRecentConversationQuery,
  useCreateConversationMutation,
} from "@/store/api/conversationsApi";
import {
  selectAgeGroup,
  setAgeGroupFromGrade,
} from "@/store/slices/ageGroupSlice";
import {
  selectGreeting,
  selectTopicDialogOpen,
  setTopicDialogOpen,
  setOnboardingModalOpen,
  selectOnboardingModalOpen,
} from "@/store/slices/uiSlice";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  // Redux state
  const ageGroup = useAppSelector(selectAgeGroup);
  const greeting = useAppSelector(selectGreeting);
  const isDialogOpen = useAppSelector(selectTopicDialogOpen);
  const showOnboardingModal = useAppSelector(selectOnboardingModalOpen);

  // Local state
  const [userName, setUserName] = useState("");

  // RTK Query hooks
  const { data: user, isLoading: isUserLoading } = useGetUserQuery();
  const userId = user?.id || "";

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useGetProfileQuery(userId, {
    skip: !userId,
  });

  const { data: topics = [], isLoading: isTopicsLoading } =
    useGetUserTopicsQuery(userId, {
      skip: !userId,
    });

  const { data: recentConversation } = useGetRecentConversationQuery(userId, {
    skip: !userId,
  });

  const { data: availableTopics = [] } = useGetCurriculumTopicsQuery(
    profile?.grade || 0,
    {
      skip: !profile?.grade,
    }
  );

  const [enrollInTopic] = useEnrollInTopicMutation();
  const [createConversation] = useCreateConversationMutation();

  // Filter available topics to show only ones user hasn't enrolled in (max 3)
  const unenrolledTopics = availableTopics
    .filter(
      (availableTopic) =>
        !topics.some((userTopic) => userTopic.id === availableTopic.id)
    )
    .slice(0, 3);

  // Check onboarding status
  useEffect(() => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    if (isProfileLoading) return;

    // If profile doesn't exist or onboarding not completed
    if (profileError || (profile && !profile.onboarding_completed)) {
      dispatch(setOnboardingModalOpen(true));
      return;
    }

    // Set age group from profile grade
    if (profile?.grade) {
      dispatch(setAgeGroupFromGrade(profile.grade));
    }

    // Set user name from profile
    if (profile?.full_name) {
      setUserName(profile.full_name);
    }
  }, [userId, profile, isProfileLoading, profileError, navigate, dispatch]);

  const isLoading = isUserLoading || isProfileLoading || isTopicsLoading;

  const handleCreateTopic = async (topic: TopicOption) => {
    try {
      if (!userId || !profile) {
        throw new Error("No user or profile found");
      }

      // Check if topic is already enrolled
      if (topics.some((t) => t.title === topic.title)) {
        toast({
          title: "שגיאה",
          description: "הנושא כבר נלמד",
          variant: "destructive",
        });
        return;
      }

      // Find the curriculum topic
      const curriculumTopic = availableTopics.find(
        (t) => t.title === topic.title
      );

      if (!curriculumTopic) {
        toast({
          title: "שגיאה",
          description: "הנושא לא נמצא עבור הכיתה שלך",
          variant: "destructive",
        });
        return;
      }

      // Enroll in the topic
      await enrollInTopic({
        userId,
        topicId: curriculumTopic.id,
      }).unwrap();

      toast({
        title: "הצלחה!",
        description: "הנושא נוסף בהצלחה",
      });

      dispatch(setTopicDialogOpen(false));
    } catch (error) {
      console.error("Error creating topic:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור את הנושא",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = () => {
    dispatch(setTopicDialogOpen(true));
  };

  const handleStartLearning = async (topic: TopicOption) => {
    try {
      if (!userId || !profile) {
        throw new Error("No user or profile found");
      }

      // Find the curriculum topic
      const curriculumTopic = availableTopics.find(
        (t) => t.title === topic.title
      );

      if (!curriculumTopic) {
        toast({
          title: "שגיאה",
          description: "הנושא לא נמצא עבור הכיתה שלך",
          variant: "destructive",
        });
        return;
      }

      // Enroll in the topic first
      await enrollInTopic({
        userId,
        topicId: curriculumTopic.id,
      }).unwrap();

      // Create a new conversation in learning mode
      const result = await createConversation({
        userId,
        topicId: curriculumTopic.id,
        title: `${topic.title} - לימוד`,
        mode: "לימוד",
      }).unwrap();

      // The result is an array, get the first item
      const conversation = Array.isArray(result) ? result[0] : result;

      if (!conversation?.id) {
        throw new Error("Failed to create conversation");
      }

      // Navigate directly to the lesson chat
      navigate(`/lesson/${conversation.id}`, {
        state: {
          mode: "לימוד",
          topic: topic.title,
          topicId: curriculumTopic.id,
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error("Error starting learning session:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להתחיל את הלימוד",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        {/* Page Header */}
        <PageHeader
          title={`${greeting}, ${userName}`}
          subtitle="בלי לחץ. פשוט ללמוד ולהשתפר בקצב שלך."
        />

        {/* Recent Conversation - Continue Learning */}
        {recentConversation && (
          <Card className="mb-8 overflow-hidden border-border card-bordered elevation-2 transition-smooth hover:elevation-3">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="text-5xl sm:text-6xl">
                    {recentConversation.topics?.icon || "🎯"}
                  </div>
                  <div className="text-center sm:text-right">
                    <h2 className="text-xl font-semibold mb-1 text-foreground">
                      המשך מאיפה שהפסקת
                    </h2>
                    <p className="text-base text-muted-foreground">
                      {recentConversation.topics?.title ||
                        recentConversation.title}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() =>
                    navigate(`/lesson/${recentConversation.id}`, {
                      state: {
                        mode: recentConversation.mode || "לימוד",
                        topic:
                          recentConversation.topics?.title ||
                          recentConversation.title,
                        topicId: recentConversation.topic_id,
                        conversationId: recentConversation.id,
                      },
                    })
                  }
                >
                  <ArrowLeft className="w-4 h-4" />
                  המשך ללמוד
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Suggested Topics - New Learning Opportunities */}
        {unenrolledTopics.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-foreground">
              נושאים חדשים ללמידה
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unenrolledTopics.map((topic, index) => (
                <Card
                  key={index}
                  className="card-bordered card-interactive cursor-pointer elevation-1"
                  onClick={() => handleStartLearning(topic)}
                >
                  <div className="p-6 text-center">
                    <div className="text-5xl mb-4">{topic.icon}</div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">
                      {topic.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      לחץ להתחלת לימוד
                    </p>
                    <div className="inline-flex items-center justify-center bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
                      התחל ללמוד
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My Topics Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            הנושאים שלי
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Add New Topic Card */}
            <Card
              className="card-bordered card-interactive cursor-pointer border-dashed elevation-0"
              onClick={handleOpenDialog}
            >
              <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
                <Plus className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold text-foreground">
                  נושא חדש
                </h3>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  צור נושא חדש ללמידה
                </p>
              </div>
            </Card>

            {/* Topic Selection Dialog */}
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => dispatch(setTopicDialogOpen(open))}
            >
              <DialogContent
                className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide [&>button]:hidden"
                dir="rtl"
              >
                <div className="grid grid-cols-2 gap-4">
                  {availableTopics.map((topic, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer card-interactive card-bordered elevation-1"
                      onClick={() => handleCreateTopic(topic)}
                    >
                      <div className="p-4 text-center">
                        <div className="text-4xl mb-2">{topic.icon}</div>
                        <h3 className="font-semibold text-base mb-1">
                          {topic.title}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Loading State */}
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              /* User's Topics */
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="card-bordered card-interactive cursor-pointer elevation-1"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-4xl">{topic.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {topic.title}
                      </h3>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {topic.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-auto pt-4 border-t border-border">
                      <span className="text-2xl font-bold text-primary">
                        {topic.conversationCount}
                      </span>
                      <span className="text-sm text-muted-foreground">שיחות</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </PageContainer>

      {/* Onboarding Modal */}
      {showOnboardingModal && (
        <OnboardingModal isOpen={showOnboardingModal} userId={userId} />
      )}
    </div>
  );
};

export default Dashboard;
