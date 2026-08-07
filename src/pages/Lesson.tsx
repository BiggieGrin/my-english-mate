import { useCallback, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  AnswerComposer,
  LessonCompleteCard,
  LessonHeader,
  LessonSkeleton,
  MessageStream,
  MilestoneChip,
} from "@/components/lesson";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useLessonChat } from "@/hooks/useLessonChat";
import { useSessionProgress } from "@/hooks/useSessionProgress";
import { useLessonCompletion, useStudyStreak } from "@/hooks/useStudyStreak";

import { useGetUserQuery } from "@/store/api/authApi";
import { useGetProfileQuery } from "@/store/api/profileApi";
import { useGetConversationByIdQuery } from "@/store/api/conversationsApi";

import { LESSON_MODES, resolveMode } from "@/lib/lessonModes";
import { firstNameOf } from "@/lib/text";

/**
 * The lesson screen.
 *
 * A thin orchestrator: it resolves who and what the session is about, wires
 * the four lesson hooks together, and lays out header / stream / composer.
 * All chat, scrolling and progress logic lives in hooks; all rendering lives
 * in components/lesson.
 */
const Lesson = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId, mode: modeSlug } = useParams();

  const conversationId: string | undefined =
    location.state?.conversationId || lessonId;

  const { data: user } = useGetUserQuery();
  const userId = user?.id;

  const { data: profile } = useGetProfileQuery(userId ?? "", {
    skip: !userId,
  });

  // The conversation row is the fallback source for both mode and topic, which
  // is what makes a bare /lesson/:id deep link or a hard refresh recover the
  // real lesson instead of defaulting to "לימוד" on a topic called "English".
  const { data: conversation, isSuccess: metaReady } =
    useGetConversationByIdQuery(conversationId!, { skip: !conversationId });

  const mode = resolveMode(modeSlug, location.state?.mode, conversation?.mode);
  const topicTitle =
    conversation?.topics?.title || location.state?.topic || "אנגלית";
  const topicId = conversation?.topic_id || location.state?.topicId;

  const chat = useLessonChat({
    conversationId,
    topicTitle,
    mode,
    userId,
    enabled: metaReady,
  });

  const progress = useSessionProgress({ messages: chat.allMessages, mode });

  const streakDays = useStudyStreak({
    profile,
    userId,
    hasStudied: chat.studentTurnCount > 0,
  });

  useLessonCompletion({
    isComplete: progress.isComplete,
    conversationId,
    userId,
    profile,
  });

  const { scrollRef, contentRef, isPinned, scrollToBottom, pin } =
    useAutoScroll();

  // The completion card is dismissible so a student who wants to keep going
  // is never blocked by their own success.
  const [completionDismissed, setCompletionDismissed] = useState(false);

  const exit = useCallback(
    () => navigate(topicId ? `/topic/${topicId}` : "/dashboard"),
    [navigate, topicId]
  );

  const handleSend = useCallback(
    (text: string, image?: string | null) => {
      pin();
      void chat.send(text, image);
    },
    [chat, pin]
  );

  if (!metaReady || chat.isBootstrapping) {
    return <LessonSkeleton />;
  }

  const showCompletion = progress.isComplete && !completionDismissed;

  return (
    <div dir="rtl" className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <LessonHeader
        topicTitle={topicTitle}
        modeLabel={LESSON_MODES[mode].label}
        exchanges={progress.exchanges}
        goal={progress.goal}
        displayRatio={progress.displayRatio}
        streakDays={streakDays}
        onExit={exit}
      />

      <MessageStream
        messages={chat.messages}
        streamingId={chat.streamingId}
        isAwaitingReply={chat.isAwaitingReply}
        onAnswer={handleSend}
        disabled={chat.isStreaming}
        announcement={chat.announcement}
        isPinned={isPinned}
        onScrollToBottom={() => scrollToBottom("smooth")}
        scrollRef={scrollRef}
        contentRef={contentRef}
        footer={
          <>
            {progress.milestone && !showCompletion && (
              <MilestoneChip kind={progress.milestone} />
            )}
            {showCompletion && (
              <LessonCompleteCard
                firstName={firstNameOf(profile?.full_name)}
                topicTitle={topicTitle}
                exchanges={progress.exchanges}
                minutes={progress.minutes}
                streakDays={streakDays}
                onContinue={() => setCompletionDismissed(true)}
                onExit={exit}
              />
            )}
          </>
        }
      />

      <AnswerComposer
        mode={mode}
        isStreaming={chat.isStreaming}
        onSend={handleSend}
        onStop={chat.stop}
      />
    </div>
  );
};

export default Lesson;
