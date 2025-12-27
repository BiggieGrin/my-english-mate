-- Make profile fields nullable to allow user creation before onboarding
-- This enables the two-phase flow: auth first, profile completion second

-- Allow null values for fields collected during onboarding
ALTER TABLE public.profiles
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN grade DROP NOT NULL,
ALTER COLUMN english_level DROP NOT NULL,
ALTER COLUMN parent_email DROP NOT NULL;

-- Ensure data integrity: if onboarding completed, all fields must be filled
-- This constraint ensures that once a user completes onboarding, all required fields are present
ALTER TABLE public.profiles
ADD CONSTRAINT check_onboarding_data_complete
CHECK (
  (onboarding_completed = false) OR
  (onboarding_completed = true AND
   full_name IS NOT NULL AND
   grade IS NOT NULL AND
   english_level IS NOT NULL AND
   parent_email IS NOT NULL)
);

-- Add comment for constraint documentation
COMMENT ON CONSTRAINT check_onboarding_data_complete ON public.profiles IS
  'Ensures profile data is complete when onboarding_completed is true. Allows null values during onboarding process.';
