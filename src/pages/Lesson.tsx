import { useState, useRef, useEffect } from "react";
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
  const { lessonId, mode: urlMode } = useParams();
  
  // Map URL mode (English) to Hebrew mode
  const getModeFromUrl = (urlMode?: string): string => {
    const modeMap: Record<string, string> = {
      learn: "לימוד",
      practice: "תרגול",
      homework: "שיעורי בית",
    };
    return urlMode ? modeMap[urlMode.toLowerCase()] || "לימוד" : "לימוד";
  };
  
  const decodedUrlMode = getModeFromUrl(urlMode);
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
  const mode = decodedUrlMode || modeFromState || fetchedMode || "לימוד";

  console.log("[Lesson] Mode from URL:", urlMode, "-> Hebrew:", decodedUrlMode, "Mode from state:", modeFromState, "Final mode:", mode);

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

  // One board = full screen. Keeps focus (eye contact): single surface, minimal chrome.
  const boardBg = "bg-[#f2f1ec]"; // simple warm board

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${boardBg}`}>
      {/* Minimal back — corner only, so board keeps focus */}
      <div className="absolute top-3 left-3 z-50">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-[hsl(215,15%,40%)] hover:text-foreground transition-colors py-1 px-2 rounded"
          aria-label="חזרה"
        >
          חזרה
        </button>
      </div>

      {/* The board is the scrollable viewport — no inner container */}
      <div
        ref={chatContainerRef}
        id="lesson-board"
        className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide ${boardBg} pb-32`}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-14 pb-20">
          {!isInitialized && messages.length === 0 && (
            <div className="flex justify-center items-center min-h-[50vh] text-[hsl(215,14%,45%)]">
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

            if (message.role === "user") {
              return (
                <div key={index} className="flex justify-start my-3">
                  <div
                    className="relative max-w-[88%] sm:max-w-sm"
                    style={{ transform: "rotate(-0.8deg)" }}
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-blue-200/20 to-transparent rounded-sm -z-10" aria-hidden />
                    <div className="bg-white/80 border-l-4 border-blue-400 rounded-sm px-4 py-3 text-gray-800 break-words shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">✏️</span>
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest board-note">תשובתך</span>
                      </div>
                      {message.image && (
                        <div className="mt-2">
                          <img src={message.image} alt="תמונה שהועלתה" className="w-full max-h-40 rounded object-contain" />
                        </div>
                      )}
                      {message.imageId && !message.image && (
                        <div dir="rtl" className="mt-1">
                          <p className="text-xs text-gray-500 board-note italic">[תמונה מצורפת]</p>
                          {message.content?.trim() && (
                            <div className="mt-2">
                              {splitByLanguage(message.content).map((seg, idx) => (
                                <p key={idx} className="text-base leading-relaxed board-note text-gray-700" dir={seg.direction} style={{ textAlign: seg.direction === "rtl" ? "right" : "left" }}>{seg.text || "\u00A0"}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!(message.imageId && !message.image) && message.content?.trim() &&
                        splitByLanguage(message.content).map((seg, idx) => (
                          <p key={idx} className="text-lg leading-relaxed mt-2 first:mt-0 board-note text-gray-700" dir={seg.direction} style={{ textAlign: seg.direction === "rtl" ? "right" : "left" }}>{seg.text || "\u00A0"}</p>
                        ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className="my-5 min-h-[2rem]">
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
                  <div className="flex items-center gap-2 text-[hsl(215,14%,45%)]">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span className="text-sm">כותבת...</span>
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
            );
          })}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="flex items-center gap-2 text-[hsl(215,14%,45%)] py-2">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <span className="text-sm">כותבת...</span>
            </div>
          )}
        </div>
      </div>
      <div ref={messagesEndRef} className="h-0" />

      {/* Input on the board — same surface, single line, keeps eye on board */}
      <div className={`sticky bottom-0 left-0 right-0 ${boardBg} border-t-4 border-dashed border-[hsl(215,30%,70%)] z-40`}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img src={selectedImage} alt="תצוגה מקדימה" className="h-12 w-12 object-cover rounded border-2 border-blue-300" />
              <button
                type="button"
                onClick={clearSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors text-xs shadow"
                aria-label="הסר תמונה"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 w-full">
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="shrink-0 p-2 rounded text-red-500 hover:bg-red-50 transition-colors"
                aria-label="עצור"
              >
                <X className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading || isTypingRef.current}
                className="shrink-0 p-2 rounded text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="שלח"
              >
                <Send className="w-6 h-6" />
              </button>
            )}
            <label htmlFor="camera-input" className={`shrink-0 p-2 rounded hover:bg-gray-200 sm:hidden transition-colors ${isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`} title="מצלמה">
              <Camera className="w-5 h-5 text-gray-600" />
            </label>
            <input id="camera-input" ref={cameraInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" capture="environment" onChange={handleImageSelect} disabled={isLoading} className="hidden" tabIndex={-1} aria-hidden="true" />
            <label htmlFor="file-input" className={`shrink-0 p-2 rounded hover:bg-gray-200 transition-colors ${isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`} title="בחר תמונה">
              <ImagePlus className="w-5 h-5 text-gray-600" />
            </label>
            <input id="file-input" ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} disabled={isLoading} className="hidden" tabIndex={-1} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              placeholder="כתוב את תשובתך..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading && !isTypingRef.current) handleSend();
              }}
              onPaste={handlePaste}
              className={`flex-1 min-w-0 bg-transparent border-0 border-b-4 border-dashed border-[hsl(215,50%,50%)] py-3 px-2 text-lg font-teacher focus:outline-none focus:border-[hsl(215,70%,45%)] placeholder:text-[hsl(215,30%,60%)] transition-colors`}
              dir="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
