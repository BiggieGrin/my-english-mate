import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Send, Mic, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [points, setPoints] = useState(150);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'שימו לב',
            description: 'יש יותר מדי בקשות. נסו שוב בעוד כמה רגעים.',
            variant: 'destructive',
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: 'שימו לב',
            description: 'נגמר הזמן החינמי. אנא הוסיפו זיכוי להמשך.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';

      // Add empty assistant message to update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לקבל תשובה מהמורה. נסו שוב.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1)); // Remove failed message
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    streamChat(input);
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
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p className="text-lg">שלחו הודעה כדי להתחיל את השיעור...</p>
            </div>
          )}
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
                <p className="text-lg whitespace-pre-wrap">{message.content}</p>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <Card className="p-4 max-w-[80%] bg-card">
                <Loader2 className="w-5 h-5 animate-spin" />
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
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
              disabled={!input.trim() || isLoading}
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
