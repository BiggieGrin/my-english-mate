-- Remove session_progress column from lesson_sessions
-- We'll keep the table for session tracking but remove progress calculation
ALTER TABLE public.lesson_sessions DROP COLUMN IF EXISTS session_progress;

-- Ensure user_topics has the correct structure for topic progress
-- The overall_progress field already exists and will be our single source of truth
ALTER TABLE public.user_topics 
  ALTER COLUMN overall_progress SET DEFAULT 0,
  ALTER COLUMN overall_progress SET NOT NULL;

-- Add index for faster topic progress lookups
CREATE INDEX IF NOT EXISTS idx_user_topics_user_topic ON public.user_topics(user_id, topic_id);