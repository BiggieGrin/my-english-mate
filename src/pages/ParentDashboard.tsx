import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, BookOpen, Clock, Award } from 'lucide-react';

const ParentDashboard = () => {
  const navigate = useNavigate();

  const studentData = {
    name: 'יואב',
    grade: 4,
    totalLessons: 23,
    weeklyActivity: 4.5,
    averageScore: 87,
    topicsProgress: [
      { topic: 'Present Simple', progress: 65, score: 92 },
      { topic: 'Colors', progress: 90, score: 95 },
      { topic: 'Animals', progress: 45, score: 78 },
      { topic: 'Family', progress: 30, score: 85 },
    ],
    recentActivity: [
      { date: '2025-01-10', lesson: 'Present Simple - Unit 3', score: 92, duration: 25 },
      { date: '2025-01-09', lesson: 'Colors - Review', score: 95, duration: 20 },
      { date: '2025-01-08', lesson: 'Animals - Lesson 2', score: 88, duration: 30 },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">לוח הבקרה להורים</h1>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowRight className="ml-2" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Student Overview */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">התקדמות {studentData.name}</h2>
              <p className="text-lg text-muted-foreground">כיתה {studentData.grade}</p>
            </div>
            <div className="text-6xl">👨‍🎓</div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{studentData.totalLessons}</p>
                <p className="text-sm text-muted-foreground">שיעורים הושלמו</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{studentData.weeklyActivity}h</p>
                <p className="text-sm text-muted-foreground">שעות השבוע</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{studentData.averageScore}%</p>
                <p className="text-sm text-muted-foreground">ממוצע כללי</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">רמה 5</p>
                <p className="text-sm text-muted-foreground">רמה נוכחית</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Topics Progress */}
        <Card className="p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6">התקדמות בנושאים</h3>
          <div className="space-y-6">
            {studentData.topicsProgress.map((topic, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{topic.topic}</h4>
                    <p className="text-sm text-muted-foreground">
                      ציון אחרון: {topic.score}%
                    </p>
                  </div>
                  <div className="text-left w-20">
                    <p className="text-xl font-bold text-primary">{topic.progress}%</p>
                  </div>
                </div>
                <Progress value={topic.progress} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-8">
          <h3 className="text-2xl font-bold mb-6">פעילות אחרונה</h3>
          <div className="space-y-4">
            {studentData.recentActivity.map((activity, index) => (
              <div 
                key={index}
                className="flex justify-between items-center p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-semibold">{activity.lesson}</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-primary">{activity.score}%</p>
                  <p className="text-sm text-muted-foreground">{activity.duration} דקות</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-8 mt-8 bg-gradient-to-br from-accent/10 to-primary/10">
          <h3 className="text-2xl font-bold mb-4">המלצות</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>✓ {studentData.name} מתקדם בצורה מצוינת! הממוצע שלו גבוה במיוחד בנושא Colors.</li>
            <li>✓ מומלץ להמשיך בתרגול יומי של 20-30 דקות.</li>
            <li>✓ נושא Animals דורש תרגול נוסף - ציון 78% מצביע על הבנה טובה אך יש מקום לשיפור.</li>
            <li>✓ המוטיבציה גבוהה - 7 ימים רצופים של פעילות!</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
