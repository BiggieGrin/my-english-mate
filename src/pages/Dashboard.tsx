import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { BarChart3, Star, User, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { TopicOption } from "@/data/englishTopics";
import OnboardingModal from "@/components/OnboardingModal";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useGetUserQuery } from "@/store/api/authApi";
import { useGetProfileQuery, useUpdateProfileMutation } from "@/store/api/profileApi";
import {
  useGetUserTopicsQuery,
  useGetCurriculumTopicsQuery,
  useEnrollInTopicMutation,
} from "@/store/api/topicsApi";
import { useGetRecentConversationQuery } from "@/store/api/conversationsApi";
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

  // Local state (for non-cached data)
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

  const {
    data: topics = [],
    isLoading: isTopicsLoading,
  } = useGetUserTopicsQuery(userId, {
    skip: !userId,
  });

  const {
    data: recentConversation,
  } = useGetRecentConversationQuery(userId, {
    skip: !userId,
  });

  const {
    data: availableTopics = [],
  } = useGetCurriculumTopicsQuery(profile?.grade || 0, {
    skip: !profile?.grade,
  });

  const [enrollInTopic] = useEnrollInTopicMutation();

  // Check onboarding status
  useEffect(() => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    if (isProfileLoading) return;

    // If profile doesn't exist or onboarding not completed
    if (
      profileError ||
      (profile && !profile.onboarding_completed)
    ) {
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

  // Calculate XP progress
  const userLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  const xpToNext = userLevel * 100;
  const xpProgress = Math.min((currentXp / xpToNext) * 100, 100);

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

  // --- Young Version (Grades 1-3) ---
  if (ageGroup === "young") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 theme-young">
        <header className="bg-white shadow-sm border-b sticky top-0 z-10 w-full max-w-full overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 py-4 max-w-full">
            <div className="flex justify-between items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl"></div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full shadow-lg">
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-white font-semibold text-sm">
                    Level {userLevel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-purple-100"
                  onClick={() => navigate("/statistics")}
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-purple-100"
                  onClick={() => navigate("/profile")}
                >
                  <User className="w-5 h-5 text-purple-600" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl overflow-x-hidden">
          <div className="mb-12 text-right">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-900 mb-3 break-words">
              {greeting}, {userName} 👋
            </h1>
            <p className="text-lg sm:text-xl text-purple-600 font-medium opacity-90 break-words">
              בלי לחץ. פשוט ללמוד ולהשתפר בקצב שלך.
            </p>
          </div>

          {recentConversation && (
            <div className="mb-12 w-full max-w-full ">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-4 sm:p-8 shadow-xl transition-transform hover:scale-[1.01] w-full max-w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    <div className="text-5xl sm:text-7xl animate-bounce-slow">
                      {recentConversation.topics?.icon || "🎯"}
                    </div>
                    <div className="text-white text-center sm:text-right">
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">
                        המשך מאיפה שהפסקת
                      </h2>
                      <p className="text-purple-50 text-base sm:text-lg break-words">
                        {recentConversation.topics?.title ||
                          recentConversation.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-purple-50 font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-lg whitespace-nowrap"
                    onClick={() => navigate(`/lesson/${recentConversation.id}`, {
                      state: {
                        mode: recentConversation.mode || 'לימוד',
                        topic: recentConversation.topics?.title || recentConversation.title,
                        topicId: recentConversation.topic_id,
                        conversationId: recentConversation.id,
                      }
                    })}
                  >
                    המשך ללמוד
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full">
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 border-2 border-dashed"
              onClick={handleOpenDialog}
            >
              <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-purple-600">
                  נושא חדש
                </h3>
                <p className="text-xs sm:text-sm text-purple-400 mt-1 sm:mt-2">
                  צור נושא חדש ללמידה
                </p>
              </div>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => dispatch(setTopicDialogOpen(open))}>
              <DialogContent
                className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide [&>button]:hidden"
                dir="rtl"
              >
                <div className="grid grid-cols-2 gap-4">
                  {availableTopics.map((topic, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-300"
                      onClick={() => handleCreateTopic(topic)}
                    >
                      <div className="p-4 text-center">
                        <div className="text-4xl mb-2">{topic.icon}</div>
                        <h3 className="font-bold text-lg mb-1">
                          {topic.title}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-slate-200 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-purple-500 before:scale-x-0 before:origin-left before:transition-transform before:duration-300 hover:before:scale-x-100"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
                    <div className="flex flex-row-reverse items-center gap-3 mb-3 sm:mb-4">
                      <span className="text-3xl sm:text-4xl md:text-5xl">
                        {topic.icon}
                      </span>
                    </div>
                    <div className="mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
                        {topic.title}
                      </h3>
                    </div>
                    {topic.description && (
                      <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 [direction:ltr] line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-2xl sm:text-3xl font-bold text-blue-500">
                        {topic.conversationCount}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500">שיחות</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
        {showOnboardingModal && (
          <OnboardingModal isOpen={showOnboardingModal} userId={userId} />
        )}
      </div>
    );
  }

  // --- Middle Version (Grades 4-6) ---
  if (ageGroup === "middle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 theme-middle">
        <header className="bg-white shadow-sm border-b sticky top-0 z-10 w-full max-w-full overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 py-4 max-w-full">
            <div className="flex justify-between items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg"></div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-full shadow-lg">
                  <div className="w-20 bg-white/30 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-sm">
                    Level {userLevel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-slate-100"
                  onClick={() => navigate("/statistics")}
                >
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-slate-100"
                  onClick={() => navigate("/profile")}
                >
                  <User className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl overflow-x-hidden">
          <div className="mb-12 text-right">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-3 break-words">
              {greeting}, {userName} 👋
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 font-medium break-words">
              בלי לחץ. פשוט ללמוד ולהשתפר בקצב שלך.
            </p>
          </div>

          {recentConversation && (
            <div className="mb-12 w-full max-w-full ">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-4 sm:p-8 shadow-xl transition-transform hover:scale-[1.01] w-full max-w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    <div className="text-5xl sm:text-7xl">
                      {recentConversation.topics?.icon || "🎯"}
                    </div>
                    <div className="text-white text-center sm:text-right ">
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">
                        המשך מאיפה שהפסקת
                      </h2>
                      <p className="text-blue-50 text-base sm:text-lg break-words">
                        {recentConversation.topics?.title ||
                          recentConversation.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-lg whitespace-nowrap"
                    onClick={() => navigate(`/lesson/${recentConversation.id}`, {
                      state: {
                        mode: recentConversation.mode || 'לימוד',
                        topic: recentConversation.topics?.title || recentConversation.title,
                        topicId: recentConversation.topic_id,
                        conversationId: recentConversation.id,
                      }
                    })}
                  >
                    המשך ללמוד
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full">
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed"
              onClick={handleOpenDialog}
            >
              <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-blue-600">
                  נושא חדש
                </h3>
                <p className="text-xs sm:text-sm text-blue-400 mt-1 sm:mt-2">
                  צור נושא חדש ללמידה
                </p>
              </div>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => dispatch(setTopicDialogOpen(open))}>
              <DialogContent
                className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide [&>button]:hidden"
                dir="rtl"
              >
                <div className="grid grid-cols-2 gap-4">
                  {availableTopics.map((topic, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
                      onClick={() => handleCreateTopic(topic)}
                    >
                      <div className="p-4 text-center">
                        <div className="text-4xl mb-2">{topic.icon}</div>
                        <h3 className="font-bold text-lg mb-1">
                          {topic.title}
                        </h3>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-slate-200 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-blue-500 before:scale-x-0 before:origin-left before:transition-transform before:duration-300 hover:before:scale-x-100"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
                    <div className="flex flex-row-reverse items-center gap-3 mb-3 sm:mb-4">
                      <span className="text-3xl sm:text-4xl md:text-5xl">
                        {topic.icon}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800">
                        {topic.title}
                      </h3>
                    </div>
                    {topic.description && (
                      <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 [direction:ltr] line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-2xl sm:text-3xl font-bold text-blue-500">
                        {topic.conversationCount}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500">שיחות</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
        {showOnboardingModal && (
          <OnboardingModal isOpen={showOnboardingModal} userId={userId} />
        )}
      </div>
    );
  }

  // --- High Version (Grades 7-12) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 theme-high">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 w-full max-w-full overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 py-4 max-w-full">
          <div className="flex-row flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-4"></div>
            <div className="gap-3 flex items-center justify-start">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-100"
                onClick={() => navigate("/statistics")}
              >
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-slate-100"
                onClick={() => navigate("/profile")}
              >
                <User className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-7xl overflow-x-hidden">
        <div className="mb-12 text-right">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 break-words">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 font-light break-words">
            בלי לחץ. פשוט ללמוד ולהשתפר בקצב שלך.
          </p>
        </div>

        {recentConversation && (
          <div className="mb-12 w-full max-w-full ">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-4 sm:p-8 shadow-xl transition-transform hover:scale-[1.01] w-full max-w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div className="text-5xl sm:text-7xl">
                    {recentConversation.topics?.icon || "🎯"}
                  </div>
                  <div className="text-white text-center sm:text-right">
                    <h2 className="text-xl sm:text-2xl font-bold mb-2">
                      המשך מאיפה שהפסקת
                    </h2>
                    <p className="text-blue-50 text-base sm:text-lg break-words">
                      {recentConversation.topics?.title ||
                        recentConversation.title}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-lg whitespace-nowrap"
                  onClick={() => navigate(`/lesson/${recentConversation.id}`, {
                    state: {
                      mode: recentConversation.mode || 'לימוד',
                      topic: recentConversation.topics?.title || recentConversation.title,
                      topicId: recentConversation.topic_id,
                      conversationId: recentConversation.id,
                    }
                  })}
                >
                  המשך ללמוד
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full">
          <Card
            className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed"
            onClick={handleOpenDialog}
          >
            <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
              <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-blue-700">
                נושא חדש
              </h3>
              <p className="text-xs sm:text-sm text-blue-500 mt-1 sm:mt-2">
                צור נושא חדש ללמידה
              </p>
            </div>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={(open) => dispatch(setTopicDialogOpen(open))}>
            <DialogContent
              className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide [&>button]:hidden"
              dir="rtl"
            >
              <div className="grid grid-cols-2 gap-4">
                {availableTopics.map((topic, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
                    onClick={() => handleCreateTopic(topic)}
                  >
                    <div className="p-4 text-center">
                      <div className="text-4xl mb-2">{topic.icon}</div>
                      <h3 className="font-bold text-lg mb-1">{topic.title}</h3>
                    </div>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            topics.map((topic) => (
              <Card
                key={topic.id}
                className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-slate-200 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-blue-600 before:scale-x-0 before:origin-left before:transition-transform before:duration-300 hover:before:scale-x-100"
                onClick={() => navigate(`/topic/${topic.id}`)}
              >
                <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
                  <div className="flex flex-row-reverse items-center gap-3 mb-3 sm:mb-4">
                    <span className="text-3xl sm:text-4xl md:text-5xl">
                      {topic.icon}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">
                      {topic.title}
                    </h3>
                  </div>
                  {topic.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 [direction:ltr] line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {topic.conversationCount}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500">שיחות</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {showOnboardingModal && (
        <OnboardingModal isOpen={showOnboardingModal} userId={userId} />
      )}
    </div>
  );
};

export default Dashboard;
