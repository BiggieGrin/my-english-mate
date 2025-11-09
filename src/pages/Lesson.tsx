import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowRight, Send, Mic, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MultipleChoiceButtons } from '@/components/MultipleChoiceButtons';
import { XpGainAnimation } from '@/components/XpGainAnimation';
import { LevelUpAnimation } from '@/components/LevelUpAnimation';
import { XpProgressBar } from '@/components/XpProgressBar';

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;
  
  const hebrewCount = (text.match(new RegExp(hebrewPattern, 'g')) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, 'g')) || []).length;
  
  return hebrewCount > englishCount ? 'rtl' : 'ltr';
};

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams(); // This is actually the conversation ID now
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: string; content: string; xpGain?: number; levelUp?: number }>>([]);
  const [input, setInput] = useState('');
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const conversationId = location.state?.conversationId || lessonId;
  const topic = location.state?.topic || 'English';
  const topicId = location.state?.topicId;
  const mode = location.state?.mode || '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history and send initial message
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!conversationId) {
          toast({
            title: 'שגיאה',
            description: 'לא נמצא מזהה שיחה.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        // Load user's level and XP
        const { data: profile } = await supabase
          .from('profiles')
          .select('level, total_points')
          .eq('id', user.id)
          .single();

        if (profile) {
          setLevel(profile.level || 1);
          setCurrentXp(profile.total_points || 0);
        }

        // Load existing messages for this conversation
        const { data: existingMessages, error } = await supabase
          .from('lesson_messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (existingMessages && existingMessages.length > 0) {
          // Load existing chat
          setMessages(existingMessages);
          setIsInitialized(true);
        } else {
          // Send initial message for new chat
          const initialMessage = `היי, אני רוצה ${mode} בנושא ${topic}`;
          await streamChat(initialMessage, true);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast({
          title: 'שגיאה',
          description: 'לא הצלחנו לטעון את ההיסטוריה של השיחה.',
          variant: 'destructive',
        });
      }
    };

    if (!isInitialized) {
      loadChatHistory();
    }
  }, [isInitialized, conversationId]);

  const streamChat = async (userMessage: string, isInitial: boolean = false) => {
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Save user message to database
      if (user && conversationId) {
        await supabase.from('lesson_messages').insert({
          user_id: user.id,
          conversation_id: conversationId,
          topic: topic,
          role: 'user',
          content: userMessage,
        });
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: newMessages, topic }),
          signal: abortControllerRef.current.signal,
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
                
                // Parse XP gains and level ups from the message
                const xpMatch = assistantMessage.match(/\+(\d+)\s*XP/);
                const levelMatch = assistantMessage.match(/עלית לרמה (\d+)/);
                const progressMatch = assistantMessage.match(/רמה (\d+) — (\d+)\/(\d+) XP/);
                
                let xpGain = undefined;
                let levelUp = undefined;
                
                if (xpMatch && !assistantMessage.includes('xp_detected')) {
                  xpGain = parseInt(xpMatch[1]);
                  const newXp = currentXp + xpGain;
                  setCurrentXp(newXp);
                  assistantMessage += ' xp_detected'; // Mark as processed
                  
                  // Update in database
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from('profiles')
                      .update({ total_points: newXp })
                      .eq('id', user.id);
                  }
                }
                
                if (levelMatch && !assistantMessage.includes('level_detected')) {
                  levelUp = parseInt(levelMatch[1]);
                  setLevel(levelUp);
                  assistantMessage += ' level_detected'; // Mark as processed
                  
                  // Update in database
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from('profiles')
                      .update({ level: levelUp })
                      .eq('id', user.id);
                  }
                }
                
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage.replace(' xp_detected', '').replace(' level_detected', ''),
                    xpGain,
                    levelUp,
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

      // Save assistant message to database
      if (user && assistantMessage && conversationId) {
        await supabase.from('lesson_messages').insert({
          user_id: user.id,
          conversation_id: conversationId,
          topic: topic,
          role: 'assistant',
          content: assistantMessage,
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Chat error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לקבל תשובה מהמורה. נסו שוב.',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1)); // Remove failed message
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      toast({
        title: 'השיעור הופסק',
        description: 'השיעור הופסק בהצלחה.',
      });
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    streamChat(input);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => navigate(topicId ? `/topic/${topicId}` : '/dashboard')}>
                <ArrowRight className="ml-2" />
                חזרה
              </Button>
            </div>
            <div className="w-full">
              <XpProgressBar 
                currentXp={currentXp % (level * 100)} 
                requiredXp={level * 100} 
                level={level} 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl overflow-y-auto">
        <div className="space-y-4">
          {!isInitialized && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
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
                {message.role === 'assistant' ? (
                  <div className="space-y-3">
                    <MultipleChoiceButtons
                      content={message.content}
                      onSelect={(choice) => streamChat(choice)}
                      disabled={isLoading || index !== messages.length - 1}
                    />
                    {message.xpGain && (
                      <XpGainAnimation amount={message.xpGain} />
                    )}
                    {message.levelUp && (
                      <LevelUpAnimation level={message.levelUp} />
                    )}
                  </div>
                ) : (
                  <p 
                    className="text-lg whitespace-pre-wrap leading-relaxed"
                    dir={detectTextDirection(message.content)}
                    style={{ textAlign: detectTextDirection(message.content) === 'rtl' ? 'right' : 'left' }}
                  >
                    {message.content}
                  </p>
                )}
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
              disabled={isLoading}
            />
            {isLoading ? (
              <Button 
                size="icon"
                variant="destructive"
                onClick={handleStop}
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {isLoading ? 'לחצו על X כדי להפסיק את השיעור' : 'השתמשו במיקרופון או כתבו את התשובה'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
