import { TEACHER_AVATAR, TEACHER_NAME } from "@/lib/lessonModes";

/**
 * Shown only while waiting for the first token. Once text starts arriving the
 * reply bubble itself carries a blinking caret, so this never competes with
 * visible content.
 */
export const TypingIndicator = () => (
  <div
    role="status"
    className="flex animate-message-in items-start gap-2.5 sm:gap-3"
  >
    <div
      aria-hidden
      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warm-soft text-lg ring-1 ring-warm-border"
    >
      {TEACHER_AVATAR}
    </div>

    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {TEACHER_NAME}
      </p>
      <div className="inline-flex items-center gap-1.5 rounded-bubble rounded-tr-md border border-teacher-border bg-teacher px-4 py-4 elevation-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="h-2 w-2 animate-dot-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>

    <span className="sr-only">המורה כותבת תשובה</span>
  </div>
);
