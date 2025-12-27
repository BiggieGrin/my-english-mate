-- Add last_chat_date column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_chat_date DATE;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.last_chat_date IS 'The last date the user sent a chat message (used for streak calculation)';
