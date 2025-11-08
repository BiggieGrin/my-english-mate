import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface XpGainAnimationProps {
  amount: number;
  onComplete?: () => void;
}

export const XpGainAnimation = ({ amount, onComplete }: XpGainAnimationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border-2 border-yellow-500 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-full animate-scale-in font-bold text-lg my-2">
      <span>+{amount} XP</span>
      <Sparkles className="w-5 h-5 animate-pulse" />
    </div>
  );
};
