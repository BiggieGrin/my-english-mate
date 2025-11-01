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

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Topic Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="text-7xl">{topicData.icon}</div>
          </div>
          <h1 className="text-4xl font-bold mb-3">{topicData.title}</h1>
          <p className="text-lg text-muted-foreground mb-8">{topicData.description}</p>
          
          {/* Progress Bar */}
          <div className="max-w-3xl mx-auto bg-slate-100 rounded-2xl p-6">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 mb-2">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${topicData.progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">התקדמות הקורס: {topicData.progress}%</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          <Button 
            size="lg" 
            variant="outline"
            className="h-16 text-base border-blue-200 hover:bg-blue-50"
            onClick={() => navigate(`/lesson/${topicId}`, { state: { topic: `הכנה למבחן - ${topicData.title}` } })}
          >
            <Brain className="ml-2 w-5 h-5" />
            הכנה למבחן
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="h-16 text-base border-blue-200 hover:bg-blue-50"
            onClick={() => navigate(`/lesson/${topicId}`, { state: { topic: topicData.title } })}
          >
            <BookOpen className="ml-2 w-5 h-5" />
            ללמוד את הנושא
          </Button>
          <Button 
            size="lg" 
            className="h-16 text-base bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => navigate(`/lesson/${topicId}`, { state: { topic: `שיעורי בית - ${topicData.title}` } })}
          >
            <Home className="ml-2 w-5 h-5" />
            שיעורי בית
          </Button>
        </div>

        {/* Lessons List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-right">השיעורים</h2>
          <div className="space-y-4">
            {topicData.lessons.map((lesson, index) => (
              <Card 
                key={lesson.id}
                className={`transition-all duration-300 hover:-translate-x-2 hover:border-blue-500 cursor-pointer ${
                  lesson.completed 
                    ? 'border-2 border-green-500/30 bg-green-50/50' 
                    : index === 2 
                    ? 'border-2 border-blue-500/30 bg-card shadow-sm' 
                    : 'border border-border'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {lesson.completed ? (
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{lesson.title}</h3>
                        {lesson.completed && (
                          <p className="text-sm text-green-600 mt-1">הושלם ✓</p>
                        )}
                      </div>
                    </div>
                    {(lesson.completed || index === 2) && (
                      <Button 
                        size="default"
                        variant={lesson.completed ? 'outline' : 'default'}
                        className={lesson.completed ? 'border-blue-200' : 'bg-blue-500 hover:bg-blue-600 text-white'}
                        onClick={() => navigate(`/lesson/${lesson.id}`)}
                      >
                        {lesson.completed ? 'חזור על השיעור' : 'התחל'}
                      </Button>
                    )}
                  </div>
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
