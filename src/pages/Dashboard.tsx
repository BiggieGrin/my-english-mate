import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { BarChart3, Star, User, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TopicOption } from "@/data/englishTopics";

type AgeGroup = "young" | "middle" | "high";

interface Topic {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  conversationCount: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<any>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("middle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<TopicOption[]>([]);
  const [recentConversation, setRecentConversation] = useState<any>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(0);
  const [xpProgress, setXpProgress] = useState(0);

  useEffect(() => {
    const data = localStorage.getItem("studentData");
    const group = localStorage.getItem("ageGroup") as AgeGroup;
    if (data) {
      setStudentData(JSON.parse(data));
    }
    if (group) {
      setAgeGroup(group);
    }
  }, []);

  useEffect(() => {
    loadTopics();
    loadRecentConversation();
    loadUserLevel();
  }, []);

  const loadUserLevel = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("level, current_xp").eq("id", user.id).single();

      if (profile) {
        const level = profile.level || 1;
        const xp = profile.current_xp || 0;
        const xpToNext = level * 100;
        const progress = Math.min((xp / xpToNext) * 100, 100);

        setUserLevel(level);
        setCurrentXp(xp);
        setXpProgress(progress);
      }
    } catch (error) {
      console.error("Error loading user level:", error);
    }
  };

  const loadTopics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch user's enrolled topics from user_topics joined with curriculum_topics
      const { data: userTopics, error: topicsError } = await supabase
        .from("user_topics")
        .select(
          `
          topic_id,
          curriculum_topics (
            id,
            title,
            icon,
            description
          )
        `,
        )
        .eq("user_id", user.id)
        .order("last_accessed_at", { ascending: false });

      if (topicsError) throw topicsError;

      // For each topic, count conversations
      const topicsWithCount = await Promise.all(
        (userTopics || []).map(async (userTopic: any) => {
          const topic = userTopic.curriculum_topics;
          const { count } = await supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("topic_id", topic.id);

          return {
            id: topic.id,
            title: topic.title,
            icon: topic.icon,
            description: topic.description,
            conversationCount: count || 0,
          };
        }),
      );

      setTopics(topicsWithCount);
    } catch (error) {
      console.error("Error loading topics:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הנושאים.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentConversation = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the most recent conversation with messages
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          topics (title, icon)
        `,
        )
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (conversations && conversations.length > 0) {
        setRecentConversation(conversations[0]);
      }
    } catch (error) {
      console.error("Error loading recent conversation:", error);
    }
  };

  const loadAvailableTopics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to know grade
      const { data: profile } = await supabase.from("profiles").select("grade").eq("id", user.id).single();

      if (profile) {
        // Fetch topics from curriculum_topics filtered by grade
        const { data: availableTopicsData, error } = await supabase
          .from("curriculum_topics")
          .select("*")
          .eq("grade", profile.grade)
          .order("title");

        if (error) {
          console.error("Error loading available topics:", error);
          toast({
            title: "שגיאה",
            description: "לא הצלחנו לטעון את הנושאים הזמינים",
            variant: "destructive",
          });
          return;
        }

        // Transform to match TopicOption interface
        const transformedTopics =
          availableTopicsData?.map((topic) => ({
            title: topic.title,
            icon: topic.icon,
            description: topic.description || "",
          })) || [];

        setAvailableTopics(transformedTopics);
      }
    } catch (error) {
      console.error("Error loading available topics:", error);
    }
  };

  const handleCreateTopic = async (topic: { title: string; icon: string; description: string | null }) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Check if topic already exists
      if (topics.some((t) => t.title === topic.title)) {
        toast({
          title: "שגיאה",
          description: "הנושא כבר נלמד",
          variant: "destructive",
        });
        return;
      }
      const userGrade = profile?.grade || 1;

      // First, insert or get the curriculum topic
      const { data: curriculumTopic, error: curriculumError } = await supabase
        .from("curriculum_topics")
        .find({
          title: topic.title,
          description: topic.description,
        })
        .select()
        .single();

      if (curriculumError) throw curriculumError;

      // Then enroll the user in this topic
      const { error: enrollError } = await supabase.from("user_topics").insert({
        user_id: user.id,
        topic_id: curriculumTopic.id,
      });

      if (enrollError) throw enrollError;

      toast({
        title: "הצלחה!",
        description: "הנושא נוסף בהצלחה",
      });

      setTopics([
        ...topics,
        {
          id: curriculumTopic.id,
          title: curriculumTopic.title,
          icon: curriculumTopic.icon,
          description: curriculumTopic.description,
          conversationCount: 0,
        },
      ]);

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating topic:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור את הנושא",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    await loadAvailableTopics();
  };

  // Young (grades 1-3) version
  if (ageGroup === "young") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 theme-young">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-200 to-pink-200 rounded-xl"></div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full shadow-lg">
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-white font-semibold text-sm">Level {userLevel}</span>
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

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Title Section */}

          {/* Last Lesson Card - Purple/Pink */}
          {recentConversation && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-7xl">{recentConversation.topics?.icon || "🎯"}</div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold mb-2">המשך מאיפה שהפסקת</h2>
                      <p className="text-purple-50 text-lg">
                        {recentConversation.topics?.title || recentConversation.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                    onClick={() => navigate(`/lesson/${recentConversation.id}`)}
                  >
                    המשך ללמוד
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Topics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add New Topic Card */}
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 border-2 border-dashed"
              onClick={handleOpenDialog}
            >
              <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
                <Plus className="w-12 h-12 text-purple-500 mb-4" />
                <h3 className="text-xl font-bold text-purple-600">נושא חדש</h3>
                <p className="text-sm text-purple-400 mt-2">צור נושא חדש ללמידה</p>
              </div>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                        <h3 className="font-bold text-lg mb-1">{topic.title}</h3>
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
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    className="p-8 pt-10"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-5xl">{topic.icon}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <p className="text-4xl font-bold text-blue-500">{topic.conversationCount}</p>
                      <p
                        style={{
                          margin: "0",
                        }}
                        className="text-sm text-slate-500 mb-3"
                      >
                        שיחות
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Middle (grades 4-6) version
  if (ageGroup === "middle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 theme-middle">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg"></div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-full shadow-lg">
                  <div className="w-20 bg-white/30 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                  </div>
                  <span className="text-white font-semibold text-sm">Level {userLevel}</span>
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

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Title Section */}

          {/* Last Lesson Card - Blue */}
          {recentConversation && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-7xl">{recentConversation.topics?.icon || "🎯"}</div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold mb-2">המשך מאיפה שהפסקת</h2>
                      <p className="text-blue-50 text-lg">
                        {recentConversation.topics?.title || recentConversation.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                    onClick={() => navigate(`/lesson/${recentConversation.id}`)}
                  >
                    המשך ללמוד
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Topics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add New Topic Card */}
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed"
              onClick={handleOpenDialog}
            >
              <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
                <Plus className="w-12 h-12 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold text-blue-600">נושא חדש</h3>
                <p className="text-sm text-blue-400 mt-2">צור נושא חדש ללמידה</p>
              </div>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-white border-slate-200 before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-blue-500 before:scale-x-0 before:origin-left before:transition-transform before:duration-300 hover:before:scale-x-100"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    className="p-8 pt-10"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-5xl">{topic.icon}</span>
                      <h3 className="text-xl font-bold text-slate-800">{topic.title}</h3>
                    </div>
                    {topic.description && <p className="text-sm text-slate-600 mb-4">{topic.description}</p>}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <p className="text-4xl font-bold text-blue-500">{topic.conversationCount}</p>
                      <p
                        style={{
                          margin: "0",
                        }}
                        className="text-sm text-slate-500 mb-3"
                      >
                        שיחות
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // High (grades 7-12) version
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 theme-high">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg"></div>
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 rounded-full shadow-lg">
                <div className="w-20 bg-white/30 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
                </div>
                <span className="text-white font-semibold text-sm">Level {userLevel}</span>
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

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Title Section */}

        {/* Last Lesson Card - Blue */}
        {recentConversation && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-7xl">{recentConversation.topics?.icon || "🎯"}</div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-2">המשך מאיפה שהפסקת</h2>
                    <p className="text-blue-50 text-lg">
                      {recentConversation.topics?.title || recentConversation.title}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                  onClick={() => navigate(`/lesson/${recentConversation.id}`)}
                >
                  המשך ללמוד
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Topics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Add New Topic Card */}
          <Card
            className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed"
            onClick={handleOpenDialog}
          >
            <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
              <Plus className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-blue-700">נושא חדש</h3>
              <p className="text-sm text-blue-500 mt-2">צור נושא חדש ללמידה</p>
            </div>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  className="p-8 pt-10"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl">{topic.icon}</span>
                    <h3 className="text-xl font-bold text-slate-800">{topic.title}</h3>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <p className="text-4xl font-bold text-blue-600">{topic.conversationCount}</p>
                    <p
                      style={{
                        margin: "0",
                      }}
                      className="text-sm text-slate-500 mb-3"
                    >
                      שיחות
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
