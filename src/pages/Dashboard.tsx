import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Home, Trophy, Sparkles, Star, Award, User, LogOut, TrendingUp } from 'lucide-react';

type AgeGroup = 'young' | 'middle' | 'high';

const Dashboard = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('middle');

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

  const topics = [
    { id: 1, title: 'Present Simple', progress: 65, icon: '📚' },
    { id: 2, title: 'Colors', progress: 90, icon: '🎨' },
    { id: 3, title: 'Animals', progress: 45, icon: '🦁' },
    { id: 4, title: 'Family', progress: 30, icon: '👨‍👩‍👧‍👦' },
    { id: 5, title: 'Food', progress: 0, icon: '🍕' },
  ];

  // Young (grades 1-3) version
  if (ageGroup === 'young') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-young-bg via-purple-50 to-pink-50 theme-young">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-lg border-b-4 border-primary/20 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-2xl shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    שלום {studentData?.name}! 🎉
                  </h1>
                  <p className="text-xs text-muted-foreground">בואו נלמד משהו חדש!</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-warning/20 to-warning/10 px-4 py-2 rounded-full border-2 border-warning/30 shadow-md">
                  <Star className="w-5 h-5 text-warning fill-warning animate-pulse" />
                  <span className="font-bold text-lg">250</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Hero Title with Animation */}
          <div className="relative mb-12">
            <div className="bg-gradient-to-r from-primary via-accent to-secondary rounded-3xl shadow-2xl p-1 bounce-in">
              <div className="bg-white rounded-3xl p-8">
                <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  מה לומדים היום? ✨
                </h2>
                <p className="text-center text-lg text-muted-foreground">בחרו נושא והתחילו להנות!</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Button 
              className="h-32 text-2xl font-bold rounded-3xl glow"
              onClick={() => navigate('/topic/1')}
            >
              <BookOpen className="ml-2 w-8 h-8" />
              ללמוד נושא חדש
            </Button>
            <Button 
              variant="secondary"
              className="h-32 text-2xl font-bold rounded-3xl"
              onClick={() => navigate('/topic/1')}
            >
              <Home className="ml-2 w-8 h-8" />
              שיעורי בית
            </Button>
            <Button 
              variant="outline"
              className="h-32 text-2xl font-bold rounded-3xl border-4"
              onClick={() => navigate('/achievements')}
            >
              <Trophy className="ml-2 w-8 h-8" />
              ההישגים שלי
            </Button>
          </div>

          {/* Topics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <Card 
                key={topic.id}
                className="p-6 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(`/topic/${topic.id}`)}
              >
                <div className="text-6xl text-center mb-4">{topic.icon}</div>
                <h3 className="text-xl font-bold text-center mb-4">{topic.title}</h3>
                <Progress value={topic.progress} className="mb-2" />
                <p className="text-center text-sm text-muted-foreground">{topic.progress}% הושלם</p>
                {topic.progress === 100 && (
                  <div className="flex justify-center mt-2">
                    <Award className="w-6 h-6 text-warning fill-warning" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Middle (grades 4-6) version
  if (ageGroup === 'middle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 theme-middle">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-lg shadow-md border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-xl shadow-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">שלום, {studentData?.name}!</h1>
                  <p className="text-sm text-muted-foreground">בואו נמשיך ללמוד 🚀</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2 rounded-lg border border-primary/20">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">5</p>
                    <p className="text-xs text-muted-foreground">רמה</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-warning/10 to-warning/5 px-3 py-2 rounded-lg border border-warning/20">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-warning">1,250</p>
                    <p className="text-xs text-muted-foreground">נקודות</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/achievements')} className="rounded-lg">
                  <Trophy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/profile')} className="rounded-lg">
                  <User className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Modern Hero Section */}
          <div className="mb-10">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-8 border border-primary/20 shadow-lg">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                מה לומדים היום? 💡
              </h2>
              <p className="text-muted-foreground">המשיכו את המסע שלכם לשליטה באנגלית</p>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            הנושאים שלי
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <Card 
                key={topic.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/topic/${topic.id}`)}
              >
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 text-center">
                  <span className="text-5xl">{topic.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-3">{topic.title}</h3>
                  <Progress value={topic.progress} className="mb-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{topic.progress}% הושלם</span>
                    {topic.progress > 0 && (
                      <Button size="sm" variant="ghost">המשך ללמוד</Button>
                    )}
                    {topic.progress === 0 && (
                      <Button size="sm">התחל</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // High (grades 7-12) version
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background theme-high">
      <header className="bg-card/90 shadow-md border-b sticky top-0 z-10 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">לוח הלימוד שלי</h1>
              <p className="text-sm text-muted-foreground">המשך את התקדמות הלימודים שלך</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg border">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all" style={{ width: '65%' }} />
                  </div>
                  <span className="text-sm font-medium">Level 6</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/achievements')} className="rounded-lg">
                <Trophy className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="rounded-lg">
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Question */}
        <div className="mb-10">
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20 shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              מה לומדים היום?
            </h2>
            <p className="text-muted-foreground text-lg">המשך את המסע האקדמי שלך לשליטה מושלמת באנגלית</p>
          </Card>
        </div>

        {/* Last Lesson Summary */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">השיעור האחרון שלך</h3>
              <p className="text-muted-foreground mb-4">
                סיימת את Present Simple - Unit 3 עם ציון 92%
              </p>
              <Button>המשך ללמוד</Button>
            </div>
            <div className="text-6xl">🎯</div>
          </div>
        </Card>

        {/* Topics List */}
        <div className="space-y-4">
          {topics.map((topic) => (
            <Card 
              key={topic.id}
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/topic/${topic.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-3xl">{topic.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{topic.title}</h3>
                    <Progress value={topic.progress} className="w-full max-w-xs" />
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-primary">{topic.progress}%</p>
                  <p className="text-xs text-muted-foreground">הושלם</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
