import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowRight, Send, Loader2, X, ImagePlus } from "lucide-react";
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

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface ChatMessage {
  role: string;
  content: string;
  image?: string; // base64 data URL
  imageId?: string; // reference to lesson_images table
  xpGain?: number;
  levelUp?: number;
}

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState(1);
  const [currentXp, setCurrentXp] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [completedTyping, setCompletedTyping] = useState<Set<number>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getXpToNextLevel = (lvl: number) => lvl * 100;

  // Smooth scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Auto-scroll while typing
  useEffect(() => {
    if (isTypingRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  // Scroll to bottom when loading state changes (new message sent)
  useEffect(() => {
    if (isLoading) {
      scrollToBottom("auto");
    }
  }, [isLoading]);

  // Clean XP-related text from message content
  const cleanMessageContent = (content: string): string => {
    return content
      .replace(/\+\d+\s*XP\s*✨?/gi, "")
      .replace(/\d+\/\d+\s*XP/gi, "")
      .replace(/רמה \d+ — \d+\/\d+ XP/g, "")
      .replace(/עלית לרמה \d+!/g, "")
      .replace(/🎉 רמה \d+! 🎉/g, "")
      .replace(/רמה \d+/g, "")
      .replace(/צברת עוד \d+ נקודות XP!.*/g, "")
      .replace(/יש לך כעת \d+ מתוך \d+ לרמה הבאה\./g, "")
      .replace(/xp_detected/g, "")
      .trim();
  };

  // Split text into segments based on language for proper direction handling
  const splitByLanguage = (text: string): Array<{ text: string; direction: "rtl" | "ltr" }> => {
    if (!text.trim()) return [];

    const segments: Array<{ text: string; direction: "rtl" | "ltr" }> = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        segments.push({ text: "", direction: "ltr" });
        continue;
      }

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

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "סוג קובץ לא נתמך",
        description: "אנא בחר/י תמונה בפורמט JPG, PNG או WebP",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "הקובץ גדול מדי",
        description: "גודל התמונה המקסימלי הוא 10MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.onerror = () => {
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את התמונה",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

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

        const { data: existingMessages, error } = await supabase
          .from("lesson_messages")
          .select("role, content, image_id")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (existingMessages && existingMessages.length > 0) {
          // Load images for messages that have image_id
          const messagesWithImages: ChatMessage[] = await Promise.all(
            existingMessages.map(async (msg) => {
              if (msg.image_id) {
                const { data: imageData } = await supabase
                  .from("lesson_images")
                  .select("image_data")
                  .eq("id", msg.image_id)
                  .maybeSingle();
                
                return {
                  role: msg.role,
                  content: msg.content,
                  image: imageData?.image_data || undefined,
                  imageId: msg.image_id,
                };
              }
              return { role: msg.role, content: msg.content };
            })
          );
          
          setMessages(messagesWithImages);
          const completedSet = new Set<number>();
          messagesWithImages.forEach((_, idx) => completedSet.add(idx));
          setCompletedTyping(completedSet);
          setIsInitialized(true);
          // Scroll to bottom after loading history
          setTimeout(() => scrollToBottom("auto"), 100);
        } else {
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

  const streamChat = async (userMessage: string, isInitial: boolean = false, imageData?: string | null) => {
    const newMessage: ChatMessage = { 
      role: "user", 
      content: userMessage,
      ...(imageData && { image: imageData })
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    // Immediately scroll to bottom when user sends message
    setTimeout(() => scrollToBottom("auto"), 0);

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

      if (user && conversationId) {
        let imageId: string | null = null;
        
        // If there's an image, save it to lesson_images first
        if (imageData) {
          const { data: savedImage, error: imageError } = await supabase
            .from("lesson_images")
            .insert({
              user_id: user.id,
              image_data: imageData,
            })
            .select("id")
            .single();
          
          if (!imageError && savedImage) {
            imageId = savedImage.id;
          }
        }
        
        await supabase.from("lesson_messages").insert({
          user_id: user.id,
          conversation_id: conversationId,
          topic: topic,
          role: "user",
          content: userMessage,
          image_id: imageId,
        });
      }

      // Prepare messages for API (without image data in content to reduce payload for history)
      const messagesForApi = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: messagesForApi, 
          topic, 
          mode,
          image: imageData || undefined
        }),
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
      const messageIndex = newMessages.length;

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

                const xpMatch = assistantMessage.match(/\+(\d+)\s*XP/);

                let xpGain = undefined;
                let levelUp = undefined;

                if (xpMatch && !assistantMessage.includes("xp_detected")) {
                  xpGain = parseInt(xpMatch[1]);

                  let newCurrentXp = currentXp + xpGain;
                  let newTotalPoints = totalPoints + xpGain;
                  let newLevel = level;

                  while (newCurrentXp >= getXpToNextLevel(newLevel)) {
                    newCurrentXp -= getXpToNextLevel(newLevel);
                    newLevel++;
                    levelUp = newLevel;
                  }

                  setCurrentXp(newCurrentXp);
                  setTotalPoints(newTotalPoints);
                  setLevel(newLevel);
                  assistantMessage += " xp_detected";

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
      setMessages((prev) => prev.slice(0, -1));
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
    // Can send if there's text OR an image
    if ((!input.trim() && !selectedImage) || isLoading) return;
    streamChat(input || "", false, selectedImage);
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
      <div
        ref={chatContainerRef}
        id="chat"
        className="flex-1 container mx-auto px-4 py-6 pb-32 max-w-4xl overflow-y-auto"
      >
        <div className="space-y-4">
          {!isInitialized && messages.length === 0 && (
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
                            isTypingRef.current = false;
                          }}
                          speed={20}
                          onTypingUpdate={() => {
                            isTypingRef.current = true;
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Display image if found in database */}
                      {message.image && (
                        <div className="mb-2">
                          <img 
                            src={message.image} 
                            alt="תמונה שהועלתה" 
                            className="max-w-full max-h-64 rounded-lg object-contain"
                          />
                        </div>
                      )}
                      
                      {/* If image was deleted (has imageId but no image data), show fallback text */}
                      {message.imageId && !message.image && (
                        <div dir="rtl">
                          <p className="text-lg leading-relaxed text-muted-foreground">
                            [תמונה מצורפת]
                          </p>
                          {/* If there's also text content, add line break and show it */}
                          {message.content && message.content.trim() && (
                            <div className="mt-2">
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
                        </div>
                      )}
                      
                      {/* Display text content only if there's no deleted image (otherwise it's shown above) */}
                      {!(message.imageId && !message.image) && message.content && message.content.trim() && splitByLanguage(message.content).map((segment, idx) => (
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
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
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
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img 
                src={selectedImage} 
                alt="תצוגה מקדימה" 
                className="h-20 w-20 object-cover rounded-lg border-2 border-primary"
              />
              <button
                onClick={clearSelectedImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 transition-colors"
                aria-label="הסר תמונה"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            {isLoading ? (
              <Button size="icon" variant="destructive" onClick={handleStop}>
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !selectedImage) || isLoading}>
                <Send className="w-5 h-5" />
              </Button>
            )}
            
            {/* Image Upload Button */}
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="shrink-0"
            >
              <ImagePlus className="w-5 h-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
            
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
