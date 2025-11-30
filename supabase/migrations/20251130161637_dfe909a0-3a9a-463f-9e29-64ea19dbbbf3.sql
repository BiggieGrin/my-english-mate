-- Add columns for granular progress tracking to user_topics
ALTER TABLE public.user_topics
ADD COLUMN IF NOT EXISTS coverage_score DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS fluency_score DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS retention_score DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS subskills_mastered JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accuracy_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fluency_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMP WITH TIME ZONE;

-- Add columns for granular tracking to lesson_sessions
ALTER TABLE public.lesson_sessions
ADD COLUMN IF NOT EXISTS subskills_practiced JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fluent_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_after_hint INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_criteria_met JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_topics_last_session ON public.user_topics(user_id, last_session_at);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_completed ON public.lesson_sessions(user_id, topic_id, completed_at) WHERE completed_at IS NOT NULL;