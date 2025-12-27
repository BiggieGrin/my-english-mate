-- Add onboarding_completed flag to profiles table
-- This tracks whether a user has completed the post-authentication onboarding flow

-- Add the onboarding_completed column with default false for new users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Set existing users as onboarding completed (migration strategy)
-- Users with non-null full_name are considered existing users
UPDATE public.profiles
SET onboarding_completed = true
WHERE full_name IS NOT NULL AND full_name != '';

-- Add index for performance optimization
-- Partial index only on incomplete onboarding for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
ON public.profiles(id, onboarding_completed)
WHERE onboarding_completed = false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'Tracks whether user has completed post-auth onboarding. False for new users, true after completing onboarding modal.';
