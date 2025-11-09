-- Add current_xp field to track XP towards next level (separate from total_points)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_xp integer DEFAULT 0;

-- Update existing profiles to set current_xp based on their level
-- This ensures existing users start at 0 XP for their current level
UPDATE public.profiles SET current_xp = 0 WHERE current_xp IS NULL;