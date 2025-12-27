-- Remove level-related columns from profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS current_xp,
DROP COLUMN IF EXISTS english_level;
