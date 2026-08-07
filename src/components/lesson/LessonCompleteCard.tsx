import { Button } from "@/components/ui/button";

interface LessonCompleteCardProps {
  firstName?: string;
  topicTitle: string;
  exchanges: number;
  minutes: number;
  streakDays: number;
  onContinue: () => void;
  onExit: () => void;
}

/**
 * Closes the loop when the session goal is reached.
 *
 * Rendered inline at the end of the stream rather than as a modal: a student
 * who wants to keep going must not have to dismiss a dialog to do it. The
 * stats are strictly things we can actually count -- turns taken, minutes in
 * this sitting, days in a row. No accuracy or mastery claim appears here,
 * because nothing in the system measures either.
 */
export const LessonCompleteCard = ({
  firstName,
  topicTitle,
  exchanges,
  minutes,
  streakDays,
  onContinue,
  onExit,
}: LessonCompleteCardProps) => {
  const stats: Array<[string, number]> = [
    ["סבבי תרגול", exchanges],
    ["דקות למידה", minutes],
    ["ימים ברצף", streakDays],
  ];

  return (
    <section className="animate-pop-in rounded-3xl border border-warm-border bg-gradient-to-b from-warm-soft to-card p-5 text-center elevation-2">
      <div
        aria-hidden
        className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-warm/15 text-3xl"
      >
        🎉
      </div>

      <h2 className="text-lg font-bold text-foreground">
        {firstName ? `כל הכבוד, ${firstName}!` : "כל הכבוד!"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        השלמת את יעד הישיבה בנושא {topicTitle}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-background/70 p-3">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="text-xl font-bold tabular-nums text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {streakDays > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          עוד יום של לימוד ותגיע/י לרצף של {streakDays + 1} ימים
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onContinue} className="h-12 flex-1 rounded-2xl text-base">
          ממשיכים לתרגל
        </Button>
        <Button
          onClick={onExit}
          variant="outline"
          className="h-12 flex-1 rounded-2xl text-base"
        >
          סיימתי להיום
        </Button>
      </div>
    </section>
  );
};
