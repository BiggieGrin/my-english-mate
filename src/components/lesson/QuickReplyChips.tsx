import { LESSON_MODES, type LessonMode } from "@/lib/lessonModes";

interface QuickReplyChipsProps {
  mode: LessonMode;
  disabled?: boolean;
  onPick: (text: string) => void;
}

/**
 * The autonomy lever (SDT).
 *
 * "לא הבנתי, תסביר שוב", "אפשר קצת יותר קל?" and "תן לי רמז" hand the student
 * control over pace, difficulty and scaffolding without making them compose a
 * sentence -- which matters most for the youngest and least confident users,
 * exactly the ones most likely to disengage instead of asking.
 *
 * Each chip sends its own text as an ordinary user message, so this needs no
 * change to the edge function.
 */
export const QuickReplyChips = ({
  mode,
  disabled,
  onPick,
}: QuickReplyChipsProps) => (
  <div className="mb-2 flex flex-wrap gap-2">
    {LESSON_MODES[mode].quickReplies.map((chip) => (
      <button
        key={chip}
        type="button"
        onClick={() => onPick(chip)}
        disabled={disabled}
        className="rounded-full border border-warm-border bg-warm-soft px-3.5 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
      >
        {chip}
      </button>
    ))}
  </div>
);
