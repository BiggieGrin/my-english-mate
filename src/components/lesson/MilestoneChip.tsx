import type { Milestone } from "@/hooks/useSessionProgress";

const COPY: Record<Milestone, { emoji: string; text: string }> = {
  quarter: { emoji: "🌱", text: "רבע מהדרך" },
  half: { emoji: "⭐", text: "חצי מהדרך!" },
  threeQuarters: { emoji: "🔥", text: "עוד קצת וסיימת" },
};

/**
 * A small "small win" marker dropped into the stream at 25/50/75%.
 *
 * Competence (SDT) comes from progress being *visible*, not from it being
 * large. Colour is always paired with text, so nothing is signalled by hue
 * alone.
 */
export const MilestoneChip = ({ kind }: { kind: Milestone }) => {
  const { emoji, text } = COPY[kind];

  return (
    <div className="flex justify-center py-1">
      <span className="inline-flex animate-pop-in items-center gap-2 rounded-full border border-warm-border bg-warm-soft px-4 py-1.5 text-sm font-medium text-warm-foreground">
        <span aria-hidden>{emoji}</span>
        {text}
      </span>
    </div>
  );
};
