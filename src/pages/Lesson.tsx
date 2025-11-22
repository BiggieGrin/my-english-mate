import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowRight, Send, Mic, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultipleChoiceButtons } from "@/components/MultipleChoiceButtons";
import { FillInTheBlankInput } from "@/components/FillInTheBlankInput";
import { XpGainAnimation } from "@/components/XpGainAnimation";
import { LevelUpAnimation } from "@/components/LevelUpAnimation";
import { XpProgressBar } from "@/components/XpProgressBar";
import { CustomTypewriter } from "@/components/CustomTypewriter";

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): "rtl" | "ltr" => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;

  const hebrewCount = (text.match(new RegExp(hebrewPattern, "g")) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, "g")) || []).length;

  return hebrewCount > englishCount ? "rtl" : "ltr";
};

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams(); // This is actually the conversation ID now
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: string; content: string; xpGain?: number; levelUp?: number }>>(
    [],
  );
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(0); // XP towards next level
  const [totalPoints, setTotalPoints] = useState(0); // Total lifetime XP
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [completedTyping, setCompletedTyping] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getXpToNextLevel = (lvl: number) => lvl * 100;

  // Clean XP-related text from message content
  const cleanMessageContent = (content: string): string => {
    return content
      .replace(/\+\d+\s*XP\s*✨?/gi, "") // Remove "+20 XP ✨"
      .replace(/\d+\/\d+\s*XP/gi, "") // Remove "20/100 XP"
      .replace(/רמה \d+ — \d+\/\d+ XP/g, "") // Remove Hebrew XP progress
      .replace(/עלית לרמה \d+!/g, "") // Remove level up text
      .replace(/🎉 רמה \d+! 🎉/g, "") // Remove level display
      .replace(/רמה \d+/g, "") // Remove "רמה X" patterns
      .replace(/צברת עוד \d+ נקודות XP!.*/g, "") // Remove "צברת עוד X נקודות XP! יש לך כעת..."
      .replace(/יש לך כעת \d+ מתוך \d+ לרמה הבאה\./g, "") // Remove progress towards next level
      .replace(/xp_detected/g, "") // Remove processing marker
      .trim();
  };

  // Split text into segments based on language for proper direction handling
  const splitByLanguage = (text: string): Array<{ text: string; direction: "rtl" | "ltr" }> => {
    if (!text.trim()) return [];

    const segments: Array<{ text: string; direction: "rtl" | "ltr" }> = [];

    // Split by newlines - each line gets its own p tag
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // Empty line - add as empty segment for spacing
        segments.push({ text: "", direction: "ltr" });
        continue;
      }

      // Detect direction based on first word of the line
      const firstWord = trimmedLine.split(/\s+/)[0];
      const direction = detectTextDirection(firstWord);
      segments.push({ text: trimmedLine, direction });
    }

    return segments;
  };

  const conversationId = location.state?.conversationId || lessonId;
  const topic = location.state?.topic || "English";
  const topicId = location.state?.topicId;
  const mode = location.state?.mode || "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  // Load chat history and send initial message
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        if (!conversationId) {
          toast({
            title: "שגיאה",
            description: "לא נמצא מזהה שיחה.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        // Load user's level and XP
        const { data: profile } = await supabase
          .from("profiles")
          .select("level, current_xp, total_points")
          .eq("id", user.id)
          .single();

        if (profile) {
          setLevel(profile.level || 1);
          setCurrentXp(profile.current_xp || 0);
          setTotalPoints(profile.total_points || 0);
        }

        // Load existing messages for this conversation
        const { data: existingMessages, error } = await supabase
          .from("lesson_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (existingMessages && existingMessages.length > 0) {
          // Load existing chat - mark all as completed typing since they're from history
          setMessages(existingMessages);
          const completedSet = new Set<number>();
          existingMessages.forEach((_, idx) => completedSet.add(idx));
          setCompletedTyping(completedSet);
          setIsInitialized(true);
        } else {
          // Send initial message for new chat
          const initialMessage = `היי, אני רוצה ${mode} בנושא ${topic}`;
          await streamChat(initialMessage, true);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ההיסטוריה של השיחה.",
          variant: "destructive",
        });
      }
    };

    if (!isInitialized) {
      loadChatHistory();
    }
  }, [isInitialized, conversationId]);

  const streamChat = async (userMessage: string, isInitial: boolean = false) => {
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Save user message to database
      if (user && conversationId) {
        await supabase.from("lesson_messages").insert({
          user_id: user.id,
          conversation_id: conversationId,
          topic: topic,
          role: "user",
          content: userMessage,
        });
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages, topic }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "שימו לב",
            description: "יש יותר מדי בקשות. נסו שוב בעוד כמה רגעים.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "שימו לב",
            description: "נגמר הזמן החינמי. אנא הוסיפו זיכוי להמשך.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";
      const messageIndex = newMessages.length; // Index for the new assistant message

      // Add empty assistant message to update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;

                // Parse XP gains from the message
                const xpMatch = assistantMessage.match(/\+(\d+)\s*XP/);

                let xpGain = undefined;
                let levelUp = undefined;

                if (xpMatch && !assistantMessage.includes("xp_detected")) {
                  xpGain = parseInt(xpMatch[1]);

                  // Calculate new XP with proper leveling logic
                  let newCurrentXp = currentXp + xpGain;
                  let newTotalPoints = totalPoints + xpGain;
                  let newLevel = level;

                  // Handle level ups with XP rollover
                  while (newCurrentXp >= getXpToNextLevel(newLevel)) {
                    newCurrentXp -= getXpToNextLevel(newLevel);
                    newLevel++;
                    levelUp = newLevel;
                  }

                  setCurrentXp(newCurrentXp);
                  setTotalPoints(newTotalPoints);
                  setLevel(newLevel);
                  assistantMessage += " xp_detected"; // Mark as processed

                  // Update in database
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from("profiles")
                      .update({
                        current_xp: newCurrentXp,
                        total_points: newTotalPoints,
                        level: newLevel,
                      })
                      .eq("id", user.id);
                  }
                }

                const cleanedMessage = assistantMessage.replace(" xp_detected", "").replace(" level_detected", "");

                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = {
                    role: "assistant",
                    content: cleanedMessage,
                    xpGain,
                    levelUp,
                  };
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }

      // Save assistant message to database
      if (user && assistantMessage && conversationId) {
        await supabase.from("lesson_messages").insert({
          user_id: user.id,
          conversation_id: conversationId,
          topic: topic,
          role: "assistant",
          content: assistantMessage,
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request was aborted");
        return;
      }
      console.error("Chat error:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לקבל תשובה מהמורה. נסו שוב.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1)); // Remove failed message
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
        title: "השיעור הופסק",
        description: "השיעור הופסק בהצלחה.",
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
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <XpProgressBar currentXp={currentXp} requiredXp={getXpToNextLevel(level)} level={level} />
            <Button variant="ghost" onClick={() => navigate(topicId ? `/topic/${topicId}` : "/dashboard")}>
              <ArrowRight className="ml-2" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-4 py-6 pb-16 max-w-4xl overflow-y-auto">
        {/* Added pb-32 for bottom input spacing */}
        <div className="space-y-4">
          {!isInitialized && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {messages.map((message, index) => {
            const cleanContent = message.role === "assistant" ? cleanMessageContent(message.content) : message.content;
            const isStreamingMessage = message.role === "assistant" && index === messages.length - 1 && isLoading;
            const hasCompletedTyping = completedTyping.has(index);

            return (
              <div key={index} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}>
                <Card
                  className={`p-4 max-w-[80%] ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="space-y-3">
                      {hasCompletedTyping ? (
                        <>
                          {cleanContent.includes("___") ? (
                            <FillInTheBlankInput content={cleanContent} />
                          ) : (
                            <MultipleChoiceButtons
                              content={cleanContent}
                              onSelect={(choice) => streamChat(choice)}
                              disabled={isLoading}
                            />
                          )}
                          {message.xpGain && <XpGainAnimation amount={message.xpGain} />}
                          {message.levelUp && <LevelUpAnimation level={message.levelUp} />}
                        </>
                      ) : isStreamingMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CustomTypewriter
                          content={cleanContent}
                          onComplete={() => {
                            setCompletedTyping((prev) => new Set(prev).add(index));
                          }}
                          speed={20}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {splitByLanguage(message.content).map((segment, idx) => (
                        <p
                          key={idx}
                          className="text-lg leading-relaxed"
                          dir={segment.direction}
                          style={{ textAlign: segment.direction === "rtl" ? "right" : "left" }}
                        >
                          {segment.text || "\u00A0"}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
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

      {/* Input Area - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex gap-2">
            {isLoading ? (
              <Button size="icon" variant="destructive" onClick={handleStop}>
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="w-5 h-5" />
              </Button>
            )}
            <Input
              placeholder="הקלד/י את התשובה שלך כאן..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 text-lg"
              disabled={isLoading}
              dir="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
