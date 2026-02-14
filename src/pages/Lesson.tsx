import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowRight, Send, Loader2, X, ImagePlus, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultipleChoiceButtons } from "@/components/MultipleChoiceButtons";
import { FillInTheBlankInput } from "@/components/FillInTheBlankInput";
import { CustomTypewriter } from "@/components/CustomTypewriter";

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): "rtl" | "ltr" => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;

  const hebrewCount = (text.match(new RegExp(hebrewPattern, "g")) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, "g")) || [])
    .length;

  return hebrewCount > englishCount ? "rtl" : "ltr";
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface ChatMessage {
  role: string;
  content: string;
  image?: string; // base64 data URL
  imageId?: string; // reference to lesson_images table
}

const Lesson = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [completedTyping, setCompletedTyping] = useState<Set<number>>(
    new Set()
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fetchedTopicId, setFetchedTopicId] = useState<string | undefined>(
    undefined
  );
  const [fetchedMode, setFetchedMode] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isAutoScrollingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user is at the bottom of the chat
  const isAtBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;

    const threshold = 50;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Force scroll to bottom
  const scrollToBottom = (smooth = false) => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Use double requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const before = container.scrollTop;
        const maxScroll = container.scrollHeight - container.clientHeight;
        container.scrollTop = maxScroll;
        const after = container.scrollTop;
        console.log(`Scroll: ${before} -> ${after}, maxScroll: ${maxScroll}, scrollHeight: ${container.scrollHeight}, clientHeight: ${container.clientHeight}`);
      });
    });
  };

  // Track user scrolling
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    let lastKnownScrollTop = container.scrollTop;
    let userScrollTimeout: NodeJS.Timeout | null = null;

    // Detect when user starts scrolling with wheel
    const handleWheel = (e: WheelEvent) => {
      // Scrolling up (negative deltaY)
      if (e.deltaY < 0) {
        shouldAutoScrollRef.current = false;
      }
    };

    const handleTouchStart = () => {
      lastKnownScrollTop = container.scrollTop;
    };

    const handleTouchMove = () => {
      const currentScroll = container.scrollTop;
      // If user dragged up (scroll position decreased)
      if (currentScroll < lastKnownScrollTop) {
        shouldAutoScrollRef.current = false;
      }
      lastKnownScrollTop = currentScroll;
    };

    const handleScroll = () => {
      // Clear any pending check
      if (userScrollTimeout) clearTimeout(userScrollTimeout);

      // Debounce to check if user returned to bottom
      userScrollTimeout = setTimeout(() => {
        if (isAtBottom()) {
          shouldAutoScrollRef.current = true;
        }
      }, 150);
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("scroll", handleScroll);
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
    };
  }, []);

  // Use MutationObserver to watch for content changes
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      console.log('Mutation detected, shouldAutoScroll:', shouldAutoScrollRef.current);
      if (shouldAutoScrollRef.current) {
        console.log('Scrolling to bottom');
        scrollToBottom();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  // Scroll when messages change
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      setTimeout(() => scrollToBottom(), 0);
    }
  }, [messages]);

  // Always scroll when sending a new message
  useEffect(() => {
    if (isLoading) {
      shouldAutoScrollRef.current = true;
      setTimeout(() => scrollToBottom(), 0);
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
      .replace(/\\_/g, "_") // Convert escaped underscores ("\___") from AI into real blanks
      .trim();
  };

  // Split text into segments based on language for proper direction handling
  const splitByLanguage = (
    text: string
  ): Array<{ text: string; direction: "rtl" | "ltr" }> => {
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
  const topicIdFromState = location.state?.topicId;
  const modeFromState = location.state?.mode;

  // Use fetched values if state values are not available
  const topicId = topicIdFromState || fetchedTopicId;
  const mode = modeFromState || fetchedMode || "לימוד";

  // Process image file (used by both file input and paste)
  const processImageFile = (file: File) => {
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
  };

  // Handle image selection from file input
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processImageFile(file);

    // Reset the input so the same file can be selected again
    if (event.target) {
      event.target.value = "";
    }
  };

  // Handle paste events for desktop
  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          processImageFile(file);
          break;
        }
      }
    }
  };

  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  // Load chat history and send initial message
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        console.log("[Lesson] Starting loadChatHistory", {
          conversationId,
          topicIdFromState,
          mode,
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("[Lesson] No user found");
          return;
        }

        if (!conversationId || conversationId === "undefined") {
          console.error("[Lesson] Invalid conversationId:", conversationId);
          toast({
            title: "שגיאה",
            description: "לא נמצא מזהה שיחה.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        // If topicId or mode is missing from state, try to fetch from the conversation
        if (
          !topicIdFromState ||
          topicIdFromState === "undefined" ||
          !modeFromState
        ) {
          const { data: conversation } = await supabase
            .from("conversations")
            .select("topic_id, mode")
            .eq("id", conversationId)
            .single();

          if (conversation?.topic_id) {
            console.log(
              "Fetched topicId from conversation:",
              conversation.topic_id
            );
            setFetchedTopicId(conversation.topic_id);
          } else {
            console.warn(
              "Could not fetch topicId for conversation:",
              conversationId
            );
          }

          if (conversation?.mode) {
            console.log("Fetched mode from conversation:", conversation.mode);
            setFetchedMode(conversation.mode);
          } else {
            console.warn(
              "Could not fetch mode for conversation:",
              conversationId
            );
          }
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
          setTimeout(() => scrollToBottom(), 100);
        } else {
          console.log(
            "[Lesson] No existing messages, starting new conversation"
          );
          const initialMessage = `היי, אני רוצה ${mode} בנושא ${topic}`;
          console.log("[Lesson] Initial message:", initialMessage);
          await streamChat(initialMessage, true);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("[Lesson] Error loading chat history:", error);
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לטעון את ההיסטוריה של השיחה.",
          variant: "destructive",
        });
        // Set initialized even on error to prevent infinite loading
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      loadChatHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, conversationId]);

  const streamChat = async (
    userMessage: string,
    isInitial: boolean = false,
    imageData?: string | null
  ) => {
    const newMessage: ChatMessage = {
      role: "user",
      content: userMessage,
      ...(imageData && { image: imageData }),
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    // Force auto-scroll when user sends message
    shouldAutoScrollRef.current = true;
    setTimeout(() => scrollToBottom(), 0);

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
      const messagesForApi = newMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messagesForApi,
            topic,
            mode,
            image: imageData || undefined,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

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
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;

                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
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
      // Focus input after loading completes
      setTimeout(() => inputRef.current?.focus(), 0);
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
    // Can send if there's text OR an image, and not currently loading or typing
    if ((!input.trim() && !selectedImage) || isLoading || isTypingRef.current) return;
    streamChat(input || "", false, selectedImage);
  };

  // Handle back button - navigate to topic or dashboard
  const handleBack = () => {
    navigate(topicId ? `/topic/${topicId}` : "/dashboard");
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-end items-center">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowRight className="ml-2" />
              חזרה
            </Button>
          </div>
        </div>
      </header>

      {/* Lesson board — one continuous board; teacher content + student sticky notes */}
      <div
        ref={chatContainerRef}
        id="lesson-board"
        className="flex-1 w-full max-w-4xl mx-auto overflow-y-auto overflow-x-hidden scrollbar-hide"
      >
        {/* Board surface: frame + content */}
        <div className="mx-3 sm:mx-4 mt-4 mb-24 rounded-2xl border-[3px] border-[hsl(210,18%,85%)] bg-[linear-gradient(180deg,hsl(210,22%,96%)_0%,hsl(210,20%,92%)_100%)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] min-h-[60vh]">
          <div className="p-4 sm:p-6 md:p-8 space-y-6">
            {!isInitialized && messages.length === 0 && (
              <div className="flex justify-center items-center min-h-[40vh] text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            {messages.map((message, index) => {
              const cleanContent =
                message.role === "assistant"
                  ? cleanMessageContent(message.content)
                  : message.content;
              const isStreamingMessage =
                message.role === "assistant" &&
                index === messages.length - 1 &&
                isLoading;
              const hasCompletedTyping = completedTyping.has(index);

              // Student answer: sticky note on the board
              if (message.role === "user") {
                return (
                  <div key={index} className="flex justify-start">
                    <div
                      className="relative max-w-[85%] sm:max-w-sm"
                      style={{ transform: "rotate(-1.5deg)" }}
                    >
                      <div className="absolute -top-1 right-4 w-5 h-2 bg-amber-200/80 rounded-sm shadow-sm -z-10" aria-hidden />
                      <div className="bg-[#fef9c3] border border-amber-200/60 shadow-md rounded-sm px-4 py-3 text-amber-950 break-words">
                        <span className="text-[10px] uppercase tracking-wide text-amber-700/80 font-medium" aria-hidden>תשובה שלי</span>
                        {message.image && (
                          <div className="mt-2 w-full">
                            <img
                              src={message.image}
                              alt="תמונה שהועלתה"
                              className="w-full max-w-full h-auto max-h-40 rounded object-contain"
                            />
                          </div>
                        )}
                        {message.imageId && !message.image && (
                          <div dir="rtl" className="mt-1">
                            <p className="text-sm text-amber-800/70">[תמונה מצורפת]</p>
                            {message.content && message.content.trim() && (
                              <div className="mt-2">
                                {splitByLanguage(message.content).map((seg, idx) => (
                                  <p key={idx} className="text-sm leading-relaxed" dir={seg.direction} style={{ textAlign: seg.direction === "rtl" ? "right" : "left" }}>{seg.text || "\u00A0"}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!(message.imageId && !message.image) && message.content && message.content.trim() &&
                          splitByLanguage(message.content).map((seg, idx) => (
                            <p key={idx} className="text-sm leading-relaxed mt-1 first:mt-0" dir={seg.direction} style={{ textAlign: seg.direction === "rtl" ? "right" : "left" }}>{seg.text || "\u00A0"}</p>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              }

              // Teacher content on the board (no card; part of the board)
              return (
                <div key={index} className="board-content">
                  <div className="min-h-[2rem]">
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
                      </>
                    ) : isStreamingMessage ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        <span className="text-sm">כותבת על הלוח...</span>
                      </div>
                    ) : (
                      <CustomTypewriter
                        key={`typewriter-${index}`}
                        content={cleanContent}
                        onComplete={() => {
                          setCompletedTyping((prev) => new Set(prev).add(index));
                          isTypingRef.current = false;
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        speed={20}
                        onTypingUpdate={() => {
                          isTypingRef.current = true;
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span className="text-sm">כותבת על הלוח...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div ref={messagesEndRef} className="h-4" />
      {/* Answer bar: add your answer (sticky note) to the board */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-[hsl(210,20%,94%)] border-t border-[hsl(210,18%,85%)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-50">
        <div className="w-full max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <p className="text-xs text-muted-foreground mb-2 text-center sm:text-right">כתוב/י תשובה והדבק/י על הלוח</p>
          {selectedImage && (
            <div className="mb-3 relative inline-block max-w-full">
              <img
                src={selectedImage}
                alt="תצוגה מקדימה"
                className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg border-2 border-primary"
              />
              <button
                onClick={clearSelectedImage}
                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 transition-colors shadow-md"
                aria-label="הסר תמונה"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 w-full">
            {isLoading ? (
              <Button
                size="icon"
                variant="destructive"
                onClick={handleStop}
                className="shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading || isTypingRef.current}
                className="shrink-0"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}

            {/* Camera Button (Mobile - opens camera) */}
            <label
              htmlFor="camera-input"
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0 sm:hidden ${
                isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
              title="פתח מצלמה"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="camera-input"
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              onChange={handleImageSelect}
              disabled={isLoading}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* Gallery/File Upload Button */}
            <label
              htmlFor="file-input"
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0 ${
                isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
              title="בחר תמונה"
            >
              <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </label>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageSelect}
              disabled={isLoading}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />

            <Input
              ref={inputRef}
              placeholder="הקלד/י את התשובה שלך כאן..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading && !isTypingRef.current) {
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              className="flex-1 min-w-0 text-base sm:text-lg"
              dir="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
