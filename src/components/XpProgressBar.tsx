import { Progress } from '@/components/ui/progress';

interface XpProgressBarProps {
  currentXp: number;
  requiredXp: number;
  level: number;
}

export const XpProgressBar = ({ currentXp, requiredXp, level }: XpProgressBarProps) => {
  const percentage = Math.min((currentXp / requiredXp) * 100, 100);

  return (
    <div className="flex items-center gap-0 relative" dir="ltr">
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg z-10 shadow-lg relative"
        style={{
          background: 'linear-gradient(135deg, #5392f5 0%, #4287f5 100%)',
          boxShadow: '0 4px 20px rgba(66, 135, 245, 0.4)'
        }}
      >
        {level}
      </div>
      <div className="flex-1 h-8 rounded-full overflow-hidden -ml-6 pl-8 relative" style={{ background: '#3a4a5c' }}>
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #5392f5 0%, #4287f5 100%)',
            boxShadow: '0 0 15px rgba(83, 146, 245, 0.5)'
          }}
        />
      </div>
    </div>
  );
};
