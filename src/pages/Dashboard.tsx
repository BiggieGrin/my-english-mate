import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AgeGroup = 'young' | 'middle' | 'high';

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
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('middle');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', icon: '📚', description: '' });

  useEffect(() => {
    const data = localStorage.getItem('studentData');
    const group = localStorage.getItem('ageGroup') as AgeGroup;
    if (data) {
      setStudentData(JSON.parse(data));
    }
    if (group) {
      setAgeGroup(group);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch topics with conversation count
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('id, title, icon, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;

      // For each topic, count conversations
      const topicsWithCount = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { count } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

          return {
            ...topic,
            conversationCount: count || 0,
          };
        })
      );

      setTopics(topicsWithCount);
    } catch (error) {
      console.error('Error loading topics:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לטעון את הנושאים.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן כותרת לנושא.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('topics')
        .insert({
          user_id: user.id,
          title: newTopic.title,
          icon: newTopic.icon || '📚',
          description: newTopic.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הנושא נוצר בהצלחה!',
      });

      setIsDialogOpen(false);
      setNewTopic({ title: '', icon: '📚', description: '' });
      loadTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו ליצור את הנושא.',
        variant: 'destructive',
      });
    }
  };

  // Young (grades 1-3) version
  if (ageGroup === 'young') {
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
                  <span className="text-white font-semibold text-sm">Level 3</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full bg-purple-100" onClick={() => navigate('/achievements')}>
                  <Trophy className="w-5 h-5 text-purple-600" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-purple-100" onClick={() => navigate('/profile')}>
                  <User className="w-5 h-5 text-purple-600" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-purple-600 mb-3">
              ?מה ללמוד היום
            </h1>
            <p className="text-slate-600">בחרו נושא והתחילו להנות!</p>
          </div>

          {/* Last Lesson Card - Purple/Pink */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-7xl">🎯</div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-2">השיעור האחרון שלך</h2>
                    <p className="text-purple-50 text-lg">סיימת את Animals עם ציון 95%</p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                  onClick={() => navigate('/topic/3')}
                >
                  המשך ללמוד
                </Button>
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add New Topic Card */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 border-2 border-dashed">
                  <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
                    <Plus className="w-12 h-12 text-purple-500 mb-4" />
                    <h3 className="text-xl font-bold text-purple-600">נושא חדש</h3>
                    <p className="text-sm text-purple-400 mt-2">צור נושא חדש ללמידה</p>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>צור נושא חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">כותרת הנושא</Label>
                    <Input
                      id="title"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      placeholder="לדוגמה: Present Simple"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">אייקון (אימוג'י)</Label>
                    <Input
                      id="icon"
                      value={newTopic.icon}
                      onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
                      placeholder="📚"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">תיאור (אופציונלי)</Label>
                    <Input
                      id="description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                      placeholder="תיאור קצר של הנושא"
                    />
                  </div>
                  <Button onClick={handleCreateTopic} className="w-full">
                    צור נושא
                  </Button>
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
                  <div className="p-8 pt-10">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-5xl">{topic.icon}</span>
                      <h3 className="text-xl font-bold text-slate-800">{topic.title}</h3>
                    </div>
                    {topic.description && (
                      <p className="text-sm text-slate-600 mb-4">{topic.description}</p>
                    )}
                    <p className="text-sm text-slate-500 mb-3">שיחות</p>
                    <p className="text-4xl font-bold text-blue-500">{topic.conversationCount}</p>
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
  if (ageGroup === 'middle') {
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
                    <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: '60%' }} />
                  </div>
                  <span className="text-white font-semibold text-sm">Level 6</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100" onClick={() => navigate('/achievements')}>
                  <Trophy className="w-5 h-5 text-slate-600" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100" onClick={() => navigate('/profile')}>
                  <User className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-blue-600 mb-3">
              ?מה ללמוד היום
            </h1>
            <p className="text-slate-600">המשך את ההקדמות מהיומיים שלך</p>
          </div>

          {/* Last Lesson Card - Blue */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-7xl">🎯</div>
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-2">השיעור האחרון שלך</h2>
                    <p className="text-blue-50 text-lg">סיימת את Unit 3 - Present Simple עם ציון 92%</p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                  onClick={() => navigate('/topic/1')}
                >
                  המשך ללמוד
                </Button>
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add New Topic Card */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed">
                  <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
                    <Plus className="w-12 h-12 text-blue-500 mb-4" />
                    <h3 className="text-xl font-bold text-blue-600">נושא חדש</h3>
                    <p className="text-sm text-blue-400 mt-2">צור נושא חדש ללמידה</p>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>צור נושא חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">כותרת הנושא</Label>
                    <Input
                      id="title"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      placeholder="לדוגמה: Present Simple"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">אייקון (אימוג'י)</Label>
                    <Input
                      id="icon"
                      value={newTopic.icon}
                      onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
                      placeholder="📚"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">תיאור (אופציונלי)</Label>
                    <Input
                      id="description"
                      value={newTopic.description}
                      onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                      placeholder="תיאור קצר של הנושא"
                    />
                  </div>
                  <Button onClick={handleCreateTopic} className="w-full">
                    צור נושא
                  </Button>
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
                  <div className="p-8 pt-10">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-5xl">{topic.icon}</span>
                      <h3 className="text-xl font-bold text-slate-800">{topic.title}</h3>
                    </div>
                    {topic.description && (
                      <p className="text-sm text-slate-600 mb-4">{topic.description}</p>
                    )}
                    <p className="text-sm text-slate-500 mb-3">שיחות</p>
                    <p className="text-4xl font-bold text-blue-500">{topic.conversationCount}</p>
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
                  <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: '65%' }} />
                </div>
                <span className="text-white font-semibold text-sm">Level 8</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100" onClick={() => navigate('/achievements')}>
                <Trophy className="w-5 h-5 text-slate-600" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100" onClick={() => navigate('/profile')}>
                <User className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-700 mb-3">
            ?מה ללמוד היום
          </h1>
          <p className="text-slate-600">המשך את המסע האקדמי שלך לשליטה מושלמת באנגלית</p>
        </div>

        {/* Last Lesson Card - Blue */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-7xl">🎯</div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold mb-2">השיעור האחרון שלך</h2>
                  <p className="text-blue-50 text-lg">סיימת את Unit 3 - Present Simple עם ציון 92%</p>
                </div>
              </div>
              <Button 
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-lg"
                onClick={() => navigate('/topic/1')}
              >
                המשך ללמוד
              </Button>
            </div>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Add New Topic Card */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Card className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 border-2 border-dashed">
                <div className="p-8 pt-10 flex flex-col items-center justify-center min-h-[200px]">
                  <Plus className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-blue-700">נושא חדש</h3>
                  <p className="text-sm text-blue-500 mt-2">צור נושא חדש ללמידה</p>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>צור נושא חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">כותרת הנושא</Label>
                  <Input
                    id="title"
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                    placeholder="לדוגמה: Present Simple"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">אייקון (אימוג'י)</Label>
                  <Input
                    id="icon"
                    value={newTopic.icon}
                    onChange={(e) => setNewTopic({ ...newTopic, icon: e.target.value })}
                    placeholder="📚"
                  />
                </div>
                <div>
                  <Label htmlFor="description">תיאור (אופציונלי)</Label>
                  <Input
                    id="description"
                    value={newTopic.description}
                    onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                    placeholder="תיאור קצר של הנושא"
                  />
                </div>
                <Button onClick={handleCreateTopic} className="w-full">
                  צור נושא
                </Button>
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
                <div className="p-8 pt-10">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl">{topic.icon}</span>
                    <h3 className="text-xl font-bold text-slate-800">{topic.title}</h3>
                  </div>
                  {topic.description && (
                    <p className="text-sm text-slate-600 mb-4">{topic.description}</p>
                  )}
                  <p className="text-sm text-slate-500 mb-3">שיחות</p>
                  <p className="text-4xl font-bold text-blue-600">{topic.conversationCount}</p>
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
