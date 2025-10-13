import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Home, Trophy, Sparkles, Star, Award } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-b from-young-bg to-purple-100 theme-young">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold">שלום {studentData?.name}! 🎉</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-warning/20 px-4 py-2 rounded-full">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <span className="font-bold">250</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Main Question Bubble */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 bounce-in">
            <h2 className="text-3xl font-bold text-center mb-4">
              איזה נושא נלמד היום? 🚀
            </h2>
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
      <div className="min-h-screen bg-background theme-middle">
        {/* Header */}
        <header className="bg-card shadow-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">שלום, {studentData?.name}!</h1>
                  <p className="text-sm text-muted-foreground">מוכנים להמשיך?</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">5</p>
                  <p className="text-xs text-muted-foreground">רמה</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">1,250</p>
                  <p className="text-xs text-muted-foreground">נקודות</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/achievements')}>
                  <Trophy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">הנושאים שלי</h2>
          
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
    <div className="min-h-screen bg-background theme-high">
      <header className="bg-card shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">לוח הלימוד שלי</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }} />
                </div>
                <span className="text-sm font-medium">Level 6</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/achievements')}>
                <Trophy className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Last Lesson Summary */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-primary/5 to-accent/5">
          <h2 className="text-lg font-semibold mb-2">השיעור האחרון</h2>
          <p className="text-muted-foreground mb-4">
            סיימת את Present Simple - Unit 3 עם ציון 92%
          </p>
          <Button>המשך ללמוד</Button>
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
