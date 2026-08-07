import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGetMessagesByConversationQuery } from "@/store/api/messagesApi";
import { useUpdateConversationMutation } from "@/store/api/conversationsApi";
import { hebrewForMode, type LessonMode } from "@/lib/lessonModes";

export interface ChatMessage {
  /** Database uuid, or a `local-*` id for a turn not yet persisted. */
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Base64 data URL, present for a freshly attached or loaded image. */
  image?: string;
  imageId?: string | null;
  /**
   * The bootstrap turn that opens a conversation. Written to the database so
   * Gemini's `contents` array starts with a user turn, but hidden from the UI
   * and excluded from progress -- the student did not write it.
   */
  isSeed?: boolean;
}

interface UseLessonChatArgs {
  conversationId?: string;
  topicTitle: string;
  mode: LessonMode;
  userId?: string;
  /** Held false until the conversation row resolves, so the seed knows its mode. */
  enabled: boolean;
}

let localIdCounter = 0;
const nextLocalId = () => `local-${++localIdCounter}`;

export function useLessonChat({
  conversationId,
  topicTitle,
  mode,
  userId,
  enabled,
}: UseLessonChatArgs) {
  const { toast } = useToast();
  const [updateConversation] = useUpdateConversationMutation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  /** Set once per completed reply, for the screen-reader live region. */
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef("");
  const streamIdRef = useRef<string | null>(null);
  const seededRef = useRef(false);
  const unmountedRef = useRef(false);

  const {
    data: history,
    isSuccess: historyLoaded,
    isError: historyFailed,
  } = useGetMessagesByConversationQuery(conversationId!, {
    skip: !conversationId || !enabled,
  });

  // Hydrate local state from the server exactly once. After that this hook
  // owns the list for the lifetime of the session -- no dual source of truth,
  // no flicker when a mutation invalidates the cache mid-stream.
  useEffect(() => {
    if (!historyLoaded || hasHydrated || !history) return;

    setMessages(
      history.map((row, index) => ({
        id: row.id,
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
        image: row.lesson_images?.image_data ?? undefined,
        imageId: row.image_id,
        // The opening user turn of any conversation is the bootstrap message.
        isSeed: index === 0 && row.role === "user",
      }))
    );
    setHasHydrated(true);
  }, [historyLoaded, history, hasHydrated]);

  useEffect(() => {
    if (historyFailed && !hasHydrated) {
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את ההיסטוריה של השיחה.",
        variant: "destructive",
      });
      setHasHydrated(true);
    }
  }, [historyFailed, hasHydrated, toast]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortRef.current?.abort();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /**
   * Flush accumulated tokens into state on the next frame.
   *
   * The previous implementation called setMessages once per token, so a
   * 600-token reply triggered ~600 renders of the whole list. Coalescing to
   * one flush per animation frame caps that at ~60/sec regardless of how fast
   * the model streams.
   */
  const flush = useCallback(() => {
    rafRef.current = null;
    const id = streamIdRef.current;
    if (!id) return;
    const text = pendingRef.current;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: text } : m))
    );
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }, [flush]);

  const finishFlush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    flush();
  }, [flush]);

  const persist = useCallback(
    async (
      role: "user" | "assistant",
      content: string,
      imageId: string | null = null
    ) => {
      if (!userId || !conversationId) return;
      await supabase.from("lesson_messages").insert({
        user_id: userId,
        conversation_id: conversationId,
        topic: topicTitle,
        role,
        content,
        image_id: imageId,
      });
    },
    [userId, conversationId, topicTitle]
  );

  const send = useCallback(
    async (text: string, image?: string | null, isSeed = false) => {
      if (!conversationId || !userId) return;

      const userMessage: ChatMessage = {
        id: nextLocalId(),
        role: "user",
        content: text,
        image: image ?? undefined,
        isSeed,
      };

      // Snapshot the history the model should see, including this turn.
      let outgoing: ChatMessage[] = [];
      setMessages((prev) => {
        outgoing = [...prev, userMessage];
        return outgoing;
      });

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantId = nextLocalId();
      streamIdRef.current = assistantId;
      pendingRef.current = "";

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        // Persist the image first so the message can reference it.
        let imageId: string | null = null;
        if (image) {
          const { data: savedImage } = await supabase
            .from("lesson_images")
            .insert({ user_id: userId, image_data: image })
            .select("id")
            .single();
          imageId = savedImage?.id ?? null;
        }
        await persist("user", text, imageId);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              messages: outgoing.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              topic: topicTitle,
              mode: hebrewForMode(mode),
              image: image || undefined,
            }),
            signal: controller.signal,
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
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        // The reply bubble renders live from here on. There is no separate
        // typewriter replay: the stream is the typewriter.
        setStreamingId(assistantId);
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const content = JSON.parse(data).choices?.[0]?.delta?.content;
              if (content) {
                pendingRef.current += content;
                scheduleFlush();
              }
            } catch {
              // A partial JSON frame at a chunk boundary; the next read completes it.
            }
          }
        }

        finishFlush();

        const reply = pendingRef.current;
        if (reply.trim()) {
          await persist("assistant", reply);
          setAnnouncement(reply);
          // conversations.last_message_at was only ever written at insert, so
          // "continue where you left off" was really ordering by creation time.
          void updateConversation({
            conversationId,
            updates: { last_message_at: new Date().toISOString() },
          });
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          // Keep whatever arrived before the stop and persist it, so it is
          // still there after a reload.
          finishFlush();
          const partial = pendingRef.current;
          if (partial.trim()) {
            await persist("assistant", partial);
            void updateConversation({
              conversationId,
              updates: { last_message_at: new Date().toISOString() },
            });
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          }
          return;
        }

        console.error("Lesson chat error:", error);
        toast({
          title: "שגיאה",
          description: "לא הצלחנו לקבל תשובה מהמורה. נסו שוב.",
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        if (!unmountedRef.current) {
          setIsStreaming(false);
          setStreamingId(null);
        }
        streamIdRef.current = null;
        abortRef.current = null;
      }
    },
    [
      conversationId,
      userId,
      topicTitle,
      mode,
      persist,
      scheduleFlush,
      finishFlush,
      toast,
      updateConversation,
    ]
  );

  // Bootstrap an empty conversation. Gated on `enabled` so the seed carries
  // the resolved mode -- previously the URL mode always defaulted to לימוד and
  // the seed fired before the conversation row came back, making the fetched
  // mode dead code.
  useEffect(() => {
    if (!enabled || !hasHydrated || seededRef.current) return;
    if (!conversationId || !userId || !topicTitle) return;
    if (messages.length > 0) return;

    seededRef.current = true;
    void send(`היי, אני רוצה ${hebrewForMode(mode)} בנושא ${topicTitle}`, null, true);
  }, [enabled, hasHydrated, conversationId, userId, topicTitle, mode, messages.length, send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** The seed is persisted for the model's benefit but never shown. */
  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.isSeed),
    [messages]
  );

  const studentTurnCount = useMemo(
    () => messages.filter((m) => m.role === "user" && !m.isSeed).length,
    [messages]
  );

  return {
    messages: visibleMessages,
    /** Includes the hidden seed; used for progress and streak decisions. */
    allMessages: messages,
    studentTurnCount,
    isStreaming,
    streamingId,
    /** True while waiting for the first token, so the typing indicator shows. */
    isAwaitingReply: isStreaming && streamingId === null,
    isBootstrapping: !hasHydrated,
    announcement,
    send,
    stop,
  };
}
