import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, BookOpen, Clock, Award, Activity, Target, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatGrade } from '@/lib/gradeUtils';

const ParentDashboard = () => {
  const navigate = useNavigate();

  const studentData = {
    name: 'יואב',
    grade: 4,
    totalLessons: 23,
    weeklyActivity: 4.5,
    averageScore: 87,
    topicsStudied: [
      { topic: 'Present Simple', score: 92 },
      { topic: 'Colors', score: 95 },
      { topic: 'Animals', score: 78 },
      { topic: 'Family', score: 85 },
    ],
    recentActivity: [
      { date: '2025-01-10', lesson: 'Present Simple - Unit 3', score: 92, duration: 25 },
      { date: '2025-01-09', lesson: 'Colors - Review', score: 95, duration: 20 },
      { date: '2025-01-08', lesson: 'Animals - Lesson 2', score: 88, duration: 30 },
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg shadow-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="w-7 h-7 text-primary" />
                לוח מעקב הורים
              </h1>
              <p className="text-sm text-muted-foreground">עקבו אחרי התקדמות הילד שלכם</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="rounded-lg">
              <ArrowRight className="ml-2" />
              חזרה לדף הבית
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Student Overview Hero */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-primary/20 shadow-xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-5xl shadow-lg border-4 border-white">
                👨‍🎓
              </div>
              <div className="absolute -bottom-2 -right-2 bg-success text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
                A+
              </div>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                התקדמות {studentData.name}
              </h2>
              <p className="text-lg text-muted-foreground mb-1">כיתה {formatGrade(studentData.grade)} | רמה מצוינת</p>
              <p className="text-sm text-success font-semibold">🔥 רצף של 7 ימי לימוד!</p>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <p className="text-3xl font-bold mb-1">{studentData.totalLessons}</p>
              <p className="text-sm text-muted-foreground">שיעורים הושלמו</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-3">
                <Clock className="w-8 h-8 text-accent" />
              </div>
              <p className="text-3xl font-bold mb-1">{studentData.weeklyActivity}h</p>
              <p className="text-sm text-muted-foreground">שעות השבוע</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-success/20 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <p className="text-3xl font-bold mb-1">{studentData.averageScore}%</p>
              <p className="text-sm text-muted-foreground">ממוצע כללי</p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-warning/20 rounded-xl flex items-center justify-center mb-3">
                <Award className="w-8 h-8 text-warning" />
              </div>
              <p className="text-3xl font-bold mb-1">רמה 5</p>
              <p className="text-sm text-muted-foreground">רמה נוכחית</p>
            </div>
          </Card>
        </div>

        {/* Topics Studied */}
        <Card className="p-8 mb-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            נושאים שנלמדו
          </h3>
          <p className="text-muted-foreground mb-6">סקירת ביצועים בנושאים השונים</p>
          <Separator className="mb-6" />
          <div className="space-y-6">
            {studentData.topicsStudied.map((topic, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{topic.topic}</h4>
                  </div>
                  <div className="text-left w-20">
                    <p className="text-xl font-bold text-primary">{topic.score}%</p>
                    <p className="text-xs text-muted-foreground">ציון אחרון</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Zap className="w-6 h-6 text-accent" />
            פעילות אחרונה
          </h3>
          <p className="text-muted-foreground mb-6">השיעורים האחרונים שבוצעו</p>
          <Separator className="mb-6" />
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
        <Card className="p-8 mt-8 bg-gradient-to-br from-accent/10 via-primary/10 to-secondary/10 border-primary/20 shadow-xl">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            💡 המלצות והערות
          </h3>
          <p className="text-sm text-muted-foreground mb-4">תובנות והמלצות מותאמות אישית</p>
          <Separator className="mb-6" />
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="text-2xl">✅</div>
              <div>
                <p className="font-semibold text-success mb-1">ביצועים מצוינים!</p>
                <p className="text-sm text-muted-foreground">
                  {studentData.name} מתקדם בצורה מצוינת! הממוצע שלו גבוה במיוחד בנושא Colors.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-2xl">💪</div>
              <div>
                <p className="font-semibold text-primary mb-1">המשיכו ברצף!</p>
                <p className="text-sm text-muted-foreground">
                  מומלץ להמשיך בתרגול יומי של 20-30 דקות לשמירה על הרמה הגבוהה.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div className="text-2xl">📚</div>
              <div>
                <p className="font-semibold text-warning mb-1">אזור לשיפור</p>
                <p className="text-sm text-muted-foreground">
                  נושא Animals דורש תרגול נוסף - ציון 78% מצביע על הבנה טובה אך יש מקום לשיפור.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="text-2xl">🔥</div>
              <div>
                <p className="font-semibold text-accent mb-1">מוטיבציה גבוהה!</p>
                <p className="text-sm text-muted-foreground">
                  7 ימים רצופים של פעילות מעידים על מחויבות והתמדה מרשימות!
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
