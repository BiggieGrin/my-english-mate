import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Star } from 'lucide-react';

interface LevelUpAnimationProps {
  level: number;
  onComplete?: () => void;
}

export const LevelUpAnimation = ({ level, onComplete }: LevelUpAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="my-4 relative">
      {/* Confetti effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute w-4 h-4 text-yellow-500 animate-ping"
            style={{
              left: `${50 + Math.cos((i * 30 * Math.PI) / 180) * 40}%`,
              top: `${50 + Math.sin((i * 30 * Math.PI) / 180) * 40}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      
      {/* Main celebration message */}
      <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-[3px] rounded-2xl animate-scale-in">
        <div className="bg-background rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
            <Star className="w-6 h-6 text-yellow-400 animate-pulse" />
            <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            🎉 עלית לרמה {level}! 🎉
          </h3>
          <p className="text-lg text-muted-foreground">
            כל הכבוד! אתה מתקדם מצוין!
          </p>
        </div>
      </div>
    </div>
  );
};
