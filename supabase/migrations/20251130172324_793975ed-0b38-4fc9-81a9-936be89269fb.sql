-- Add session_progress to lesson_sessions for real-time progress tracking (0-100, continuous)
ALTER TABLE public.lesson_sessions
ADD COLUMN IF NOT EXISTS session_progress DECIMAL(5,2) DEFAULT 0.00;

-- Add XP calculation fields to lesson_sessions
ALTER TABLE public.lesson_sessions
ADD COLUMN IF NOT EXISTS response_time_avg INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium';

COMMENT ON COLUMN public.lesson_sessions.session_progress IS 'Real-time progress of the current session (0-100, continuous decimal)';
COMMENT ON COLUMN public.lesson_sessions.response_time_avg IS 'Average response time in seconds for XP calculation';
COMMENT ON COLUMN public.lesson_sessions.difficulty_level IS 'Difficulty level (easy, medium, hard) for XP calculation';