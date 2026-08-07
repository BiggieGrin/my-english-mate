import { Flame } from "lucide-react";

/**
 * Day streak.
 *
 * Loss aversion is the point, but the framing lives in the completion card
 * ("עוד יום ורצף של N+1"), never as a nagging banner -- pressure applied at
 * the moment of success reads as encouragement; pressure applied on arrival
 * reads as a demand.
 */
export const StreakBadge = ({ days }: { days: number }) => {
  if (days <= 0) return null;

  return (
    <div
      role="status"
      aria-label={`רצף למידה: ${days} ימים ברצף`}
      className="hidden shrink-0 items-center gap-1.5 rounded-full border border-warm-border bg-warm-soft px-3 py-1.5 sm:flex"
    >
      <Flame className="h-4 w-4 text-warm" aria-hidden />
      <span className="text-sm font-bold tabular-nums text-warm-foreground">
        {days}
      </span>
    </div>
  );
};
