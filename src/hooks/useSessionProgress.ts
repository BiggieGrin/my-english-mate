import { useEffect, useMemo, useRef, useState } from "react";
import { LESSON_MODES, type LessonMode } from "@/lib/lessonModes";
import type { ChatMessage } from "@/hooks/useLessonChat";

export type Milestone = "quarter" | "half" | "threeQuarters";

/**
 * Session progress, derived entirely from data that exists today.
 *
 * IMPORTANT: this measures *participation*, not learning. Nothing in the
 * system produces a correct/incorrect signal -- the edge function streams
 * prose and its system prompt forbids emitting scores -- so any mastery,
 * accuracy or XP number would be fabricated. Copy built on this hook must say
 * "סבב 5 מתוך 8", never "80% שליטה".
 */
export function useSessionProgress({
  messages,
  mode,
}: {
  messages: ChatMessage[];
  mode: LessonMode;
}) {
  const goal = LESSON_MODES[mode].sessionGoal;

  // A student turn is unambiguous evidence of engagement. An assistant turn
  // can be an unprompted follow-up or a retry, so it would not be honest to
  // label. The seed is excluded: the student did not write it.
  const exchanges = useMemo(
    () => messages.filter((m) => m.role === "user" && !m.isSeed).length,
    [messages]
  );

  const ratio = Math.min(exchanges / goal, 1);

  // Endowed progress (Nunes & Drèze): the ring is never empty on arrival, and
  // an artificially advanced start measurably raises completion. The numeric
  // label in the ring still shows the true count, so nothing is misreported.
  const displayRatio = Math.min((exchanges + 1) / (goal + 1), 1);

  const isComplete = exchanges >= goal;

  // Time in this sitting only. A resumed conversation's created_at could be
  // weeks old, which would make "דקות למידה" meaningless.
  const startedAtRef = useRef(Date.now());
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setMinutes(Math.floor((Date.now() - startedAtRef.current) / 60_000)),
      30_000
    );
    return () => clearInterval(id);
  }, []);

  // Each milestone fires exactly once per mount.
  const firedRef = useRef<Set<Milestone>>(new Set());
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  useEffect(() => {
    const reached: Milestone | null =
      ratio >= 0.75
        ? "threeQuarters"
        : ratio >= 0.5
          ? "half"
          : ratio >= 0.25
            ? "quarter"
            : null;

    if (!reached || firedRef.current.has(reached)) return;
    firedRef.current.add(reached);
    setMilestone(reached);
  }, [ratio]);

  return { exchanges, goal, ratio, displayRatio, isComplete, minutes, milestone };
}
