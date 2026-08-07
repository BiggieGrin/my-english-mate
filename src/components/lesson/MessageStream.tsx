import { ChevronDown } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { TeacherMessage } from "./TeacherMessage";
import { StudentMessage } from "./StudentMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage } from "@/hooks/useLessonChat";

interface MessageStreamProps {
  messages: ChatMessage[];
  streamingId: string | null;
  isAwaitingReply: boolean;
  onAnswer: (choice: string) => void;
  disabled: boolean;
  /** Announced once per completed reply; never per token. */
  announcement: string;
  isPinned: boolean;
  onScrollToBottom: () => void;
  scrollRef: React.Ref<HTMLDivElement>;
  contentRef: React.Ref<HTMLDivElement>;
  /** Milestone chips and the completion card, appended after the last turn. */
  footer?: ReactNode;
}

export const MessageStream = forwardRef<HTMLDivElement, MessageStreamProps>(
  (
    {
      messages,
      streamingId,
      isAwaitingReply,
      onAnswer,
      disabled,
      announcement,
      isPinned,
      onScrollToBottom,
      scrollRef,
      contentRef,
      footer,
    },
    _ref
  ) => {
    const lastAssistantId = [...messages]
      .reverse()
      .find((m) => m.role === "assistant")?.id;

    return (
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          role="log"
          aria-label="שיחת השיעור"
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide [scrollbar-gutter:stable]"
        >
          {/* overflow-anchor is disabled so Chrome's scroll anchoring does not
              fight the ResizeObserver while a reply streams in. */}
          <div
            ref={contentRef}
            className="mx-auto w-full max-w-3xl space-y-5 px-3 pb-8 pt-6 [overflow-anchor:none] sm:px-4"
          >
            {messages.map((message) =>
              message.role === "user" ? (
                <StudentMessage
                  key={message.id}
                  content={message.content}
                  image={message.image}
                />
              ) : (
                <TeacherMessage
                  key={message.id}
                  content={message.content}
                  isStreaming={message.id === streamingId}
                  interactive={message.id === lastAssistantId}
                  onAnswer={onAnswer}
                  disabled={disabled}
                />
              )
            )}

            {isAwaitingReply && <TypingIndicator />}
            {footer}
          </div>
        </div>

        {!isPinned && (
          <button
            type="button"
            onClick={onScrollToBottom}
            aria-label="גלול לתחתית השיחה"
            className="absolute bottom-4 left-1/2 z-10 grid h-11 w-11 -translate-x-1/2 animate-pop-in place-items-center rounded-full border border-warm-border bg-card elevation-3"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
      </div>
    );
  }
);

MessageStream.displayName = "MessageStream";
