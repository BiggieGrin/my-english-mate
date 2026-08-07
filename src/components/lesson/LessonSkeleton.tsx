/** Shown while the conversation row resolves, before the mode is known. */
export const LessonSkeleton = () => (
  <div dir="rtl" className="flex h-dvh flex-col overflow-hidden bg-canvas">
    <header className="shrink-0 border-b border-warm-border/70 bg-card/85">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-3 sm:px-4">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
      </div>
    </header>

    <div className="flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-3 pt-6 sm:px-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="h-24 flex-1 animate-pulse rounded-bubble bg-muted" />
        </div>
        <div className="flex justify-end">
          <div className="h-12 w-1/2 animate-pulse rounded-bubble bg-muted" />
        </div>
      </div>
    </div>

    <span className="sr-only">טוען את השיעור</span>
  </div>
);
