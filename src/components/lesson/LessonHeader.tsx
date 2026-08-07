import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionProgressRing } from "./SessionProgressRing";
import { StreakBadge } from "./StreakBadge";

interface LessonHeaderProps {
  topicTitle: string;
  modeLabel: string;
  exchanges: number;
  goal: number;
  displayRatio: number;
  streakDays: number;
  onExit: () => void;
}

/**
 * Fixed 64px header. Everything here is orientation and motivation -- what am
 * I studying, how far in am I, and how do I leave. Nothing scrolls away,
 * which is what lets the message stream below carry no chrome of its own.
 *
 * ArrowRight is "back" in RTL. (Topic.tsx uses ArrowLeft for "forward".)
 */
export const LessonHeader = ({
  topicTitle,
  modeLabel,
  exchanges,
  goal,
  displayRatio,
  streakDays,
  onExit,
}: LessonHeaderProps) => (
  <header className="z-20 shrink-0 border-b border-warm-border/70 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
    <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        aria-label="יציאה מהשיעור"
        className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:bg-warm-soft hover:text-foreground"
      >
        <ArrowRight className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
          {topicTitle}
        </h1>
        <p className="truncate text-xs text-muted-foreground">{modeLabel}</p>
      </div>

      <StreakBadge days={streakDays} />
      <SessionProgressRing
        exchanges={exchanges}
        goal={goal}
        displayRatio={displayRatio}
      />
    </div>
  </header>
);
