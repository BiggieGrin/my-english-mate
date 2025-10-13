import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy, Star, Award, TrendingUp } from 'lucide-react';
import achievementsImg from '@/assets/achievements.jpg';

const Achievements = () => {
  const navigate = useNavigate();

  const stats = {
    totalPoints: 1250,
    level: 5,
    lessonsCompleted: 23,
    streak: 7,
    badges: [
      { id: 1, title: 'מתחיל מצטיין', icon: '🌟', unlocked: true },
      { id: 2, title: 'כוכב הכיתה', icon: '⭐', unlocked: true },
      { id: 3, title: 'מלך התרגול', icon: '👑', unlocked: true },
      { id: 4, title: 'גאון השפות', icon: '🧠', unlocked: false },
      { id: 5, title: 'מאסטר אנגלית', icon: '🏆', unlocked: false },
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowRight className="ml-2" />
            חזרה ללוח הבית
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 bounce-in">
          <Trophy className="w-20 h-20 text-warning mx-auto mb-4 fill-warning" />
          <h1 className="text-4xl font-bold mb-2">ההישגים המדהימים שלך!</h1>
          <p className="text-xl text-muted-foreground">המשך ככה, אתה עושה עבודה נהדרת!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 text-center">
            <Star className="w-12 h-12 text-warning mx-auto mb-2 fill-warning" />
            <p className="text-3xl font-bold text-primary">{stats.totalPoints}</p>
            <p className="text-sm text-muted-foreground">נקודות כוללות</p>
          </Card>

          <Card className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{stats.level}</p>
            <p className="text-sm text-muted-foreground">רמה נוכחית</p>
          </Card>

          <Card className="p-6 text-center">
            <Award className="w-12 h-12 text-secondary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{stats.lessonsCompleted}</p>
            <p className="text-sm text-muted-foreground">שיעורים הושלמו</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 text-3xl mx-auto mb-2">🔥</div>
            <p className="text-3xl font-bold text-primary">{stats.streak}</p>
            <p className="text-sm text-muted-foreground">ימים רצופים</p>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="p-8 mb-12 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">רמה {stats.level}</h3>
              <p className="text-muted-foreground">עוד 250 נקודות לרמה הבאה!</p>
            </div>
            <div className="text-6xl">🚀</div>
          </div>
          <Progress value={75} className="h-4" />
        </Card>

        {/* Badges */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-center">תגי ההצטיינות שלך</h2>
          <div className="grid md:grid-cols-5 gap-6 mb-8">
            {stats.badges.map((badge) => (
              <Card 
                key={badge.id}
                className={`p-6 text-center ${
                  badge.unlocked 
                    ? 'bg-gradient-to-br from-warning/20 to-accent/20 hover:scale-105' 
                    : 'opacity-40 grayscale'
                } transition-all`}
              >
                <div className="text-5xl mb-3">{badge.icon}</div>
                <h4 className="font-bold text-sm">{badge.title}</h4>
                {badge.unlocked && (
                  <p className="text-xs text-success mt-1">✓ פתוח</p>
                )}
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <img 
              src={achievementsImg} 
              alt="תגי הישגים" 
              className="rounded-2xl shadow-xl max-w-2xl mx-auto"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" onClick={() => navigate('/dashboard')}>
            בואו נמשיך ללמוד!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
