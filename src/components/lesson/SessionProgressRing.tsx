import { cn } from "@/lib/utils";

interface SessionProgressRingProps {
  /** True count of student turns. Always what the label shows. */
  exchanges: number;
  goal: number;
  /** Endowed-progress ratio used for the fill only. */
  displayRatio: number;
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Session progress as a ring.
 *
 * The fill uses `displayRatio`, which is nudged by endowed progress so the
 * ring is never empty on arrival. The number in the centre is the true count,
 * so nothing is overstated. Above 75% the ring pulses -- a goal-gradient cue
 * that proximity to the goal is salient without faking the percentage.
 */
export const SessionProgressRing = ({
  exchanges,
  goal,
  displayRatio,
}: SessionProgressRingProps) => {
  const offset = CIRCUMFERENCE * (1 - Math.min(displayRatio, 1));

  return (
    <div
      role="progressbar"
      aria-valuenow={exchanges}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuetext={`${exchanges} מתוך ${goal} סבבי תרגול`}
      className={cn(
        "relative h-11 w-11 shrink-0",
        displayRatio >= 0.75 && "animate-ring-pulse"
      )}
    >
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          className="stroke-warm-border"
        />
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-warm transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-bold tabular-nums text-foreground">
        {exchanges}
      </span>
    </div>
  );
};
