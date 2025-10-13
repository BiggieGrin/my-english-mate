import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Send, Mic, Star } from 'lucide-react';

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'שלום! אני המורה החכמה שלך לאנגלית 😊 היום נלמד על Present Simple. מוכנים להתחיל?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [points, setPoints] = useState(150);

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    setMessages([...messages, { role: 'user', content: input }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצוין! עכשיו בואו ננסה להבין מתי משתמשים ב-Present Simple. זה הזמן שמדבר על דברים שקורים כל הזמן, כמו "I play football" (אני משחק כדורגל).' 
      }]);
      setPoints(prev => prev + 10);
    }, 1000);

    setInput('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowRight className="ml-2" />
              חזרה
            </Button>
            <div className="flex items-center gap-2 bg-warning/20 px-4 py-2 rounded-full">
              <Star className="w-5 h-5 text-warning fill-warning" />
              <span className="font-bold">{points}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <Card 
                className={`p-4 max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                }`}
              >
                <p className="text-lg">{message.content}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border-t">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline"
              className="shrink-0"
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Input
              placeholder="כתבו את התשובה שלכם..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 text-lg"
            />
            <Button 
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            השתמשו במיקרופון או כתבו את התשובה
          </p>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
