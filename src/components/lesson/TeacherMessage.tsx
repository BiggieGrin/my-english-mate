import { MultipleChoiceButtons } from "@/components/MultipleChoiceButtons";
import { FillInTheBlankInput } from "@/components/FillInTheBlankInput";
import { RichText } from "./RichText";
import { hasBlanks, hasChoices } from "@/lib/text";
import { TEACHER_AVATAR, TEACHER_NAME } from "@/lib/lessonModes";

interface TeacherMessageProps {
  content: string;
  isStreaming?: boolean;
  /**
   * Only the latest finished reply is interactive. Older turns render as
   * static prose so the student cannot re-answer an earlier question and
   * desynchronise the conversation.
   */
  interactive?: boolean;
  onAnswer?: (choice: string) => void;
  disabled?: boolean;
}

/**
 * A turn from the tutor.
 *
 * The avatar and persona name are the relatedness cue (SDT): one consistent,
 * named identity on every turn. Previously the assistant had no container and
 * no identity at all -- its replies were bare text laid directly on the page,
 * visually indistinguishable from page chrome.
 */
export const TeacherMessage = ({
  content,
  isStreaming = false,
  interactive = false,
  onAnswer,
  disabled,
}: TeacherMessageProps) => {
  const showChoices = interactive && !isStreaming && hasChoices(content);
  const showBlanks = interactive && !isStreaming && !showChoices && hasBlanks(content);

  return (
    <article className="flex animate-message-in items-start gap-2.5 sm:gap-3">
      <div
        aria-hidden
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warm-soft text-lg ring-1 ring-warm-border"
      >
        {TEACHER_AVATAR}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {TEACHER_NAME}
        </p>
        <div className="rounded-bubble rounded-tr-md border border-teacher-border bg-teacher px-4 py-3 elevation-1">
          {showChoices ? (
            <MultipleChoiceButtons
              content={content}
              onSelect={(choice) => onAnswer?.(choice)}
              disabled={disabled}
            />
          ) : showBlanks ? (
            <FillInTheBlankInput content={content} />
          ) : (
            <RichText content={content} caret={isStreaming} />
          )}
        </div>
      </div>
    </article>
  );
};
