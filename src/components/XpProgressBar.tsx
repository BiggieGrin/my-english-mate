import { Progress } from '@/components/ui/progress';

interface XpProgressBarProps {
  currentXp: number;
  requiredXp: number;
  level: number;
}

export const XpProgressBar = ({ currentXp, requiredXp, level }: XpProgressBarProps) => {
  const percentage = Math.min((currentXp / requiredXp) * 100, 100);

  return (
    <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          רמה {level}
        </span>
      </div>
      <div className="flex-1 min-w-[120px]">
        <Progress 
          value={percentage} 
          className="h-2 bg-muted"
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {currentXp}/{requiredXp} XP
      </span>
    </div>
  );
};
