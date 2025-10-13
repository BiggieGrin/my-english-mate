import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Home, Brain, ArrowRight, CheckCircle2 } from 'lucide-react';

const Topic = () => {
  const navigate = useNavigate();
  const { topicId } = useParams();

  const topicData = {
    title: 'Present Simple',
    description: 'היום נלמד על Present Simple - הזמן שמתאר הרגלים ופעולות קבועות',
    icon: '📚',
    progress: 65,
    lessons: [
      { id: 1, title: 'מה זה Present Simple?', completed: true },
      { id: 2, title: 'מתי משתמשים בו?', completed: true },
      { id: 3, title: 'תרגול - משפטים חיוביים', completed: false },
      { id: 4, title: 'תרגול - שאלות', completed: false },
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Topic Header */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-start gap-6">
            <div className="text-6xl">{topicData.icon}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{topicData.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{topicData.description}</p>
              <Progress value={topicData.progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">{topicData.progress}% מהנושא הושלם</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Button 
            size="lg" 
            className="h-20"
            onClick={() => navigate(`/lesson/${topicId}`)}
          >
            <BookOpen className="ml-2 w-6 h-6" />
            ללמוד את הנושא
          </Button>
          <Button 
            size="lg" 
            variant="secondary"
            className="h-20"
            onClick={() => navigate(`/lesson/${topicId}`)}
          >
            <Home className="ml-2 w-6 h-6" />
            שיעורי בית
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="h-20"
            onClick={() => navigate(`/lesson/${topicId}`)}
          >
            <Brain className="ml-2 w-6 h-6" />
            הכנה למבחן
          </Button>
        </div>

        {/* Lessons List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">השיעורים</h2>
          <div className="space-y-3">
            {topicData.lessons.map((lesson) => (
              <Card 
                key={lesson.id}
                className={`p-6 cursor-pointer hover:shadow-md transition-shadow ${
                  lesson.completed ? 'bg-success/5' : ''
                }`}
                onClick={() => navigate(`/lesson/${lesson.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {lesson.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted" />
                    )}
                    <div>
                      <h3 className="font-semibold">{lesson.title}</h3>
                      {lesson.completed && (
                        <p className="text-sm text-success">הושלם ✓</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant={lesson.completed ? 'outline' : 'default'}>
                    {lesson.completed ? 'חזור על השיעור' : 'התחל'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topic;
