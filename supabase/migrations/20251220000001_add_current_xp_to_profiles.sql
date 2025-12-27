-- Add current_xp column to profiles table
ALTER TABLE profiles
ADD COLUMN current_xp INTEGER DEFAULT 0 NOT NULL;

-- Add a check constraint to ensure XP is non-negative
ALTER TABLE profiles
ADD CONSTRAINT profiles_current_xp_check CHECK (current_xp >= 0);

-- Create an index on current_xp for better query performance
CREATE INDEX idx_profiles_current_xp ON profiles(current_xp);

-- Update existing profiles to have 0 XP
UPDATE profiles
SET current_xp = 0
WHERE current_xp IS NULL;
