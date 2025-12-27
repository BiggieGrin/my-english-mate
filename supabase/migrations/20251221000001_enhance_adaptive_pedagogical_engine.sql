-- Enhancement: Adaptive Pedagogical Engine
-- Add tracking columns for response time, Hebrew reliance, vocabulary metrics, and difficulty progression

-- Add new metrics columns to lesson_sessions
ALTER TABLE lesson_sessions
ADD COLUMN IF NOT EXISTS response_times INTEGER[],
ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS hebrew_translation_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vocabulary_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS difficulty_progression JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_growth_breakdown JSONB DEFAULT '{}';

-- Add comments to explain the new columns
COMMENT ON COLUMN lesson_sessions.response_times IS 'Array of response times in milliseconds for each question';
COMMENT ON COLUMN lesson_sessions.avg_response_time_ms IS 'Average response time across all questions in the session';
COMMENT ON COLUMN lesson_sessions.hebrew_translation_requests IS 'Number of times user requested Hebrew translation or help';
COMMENT ON COLUMN lesson_sessions.vocabulary_metrics IS 'JSON object containing: unique_words_used, advanced_words_used[], vocabulary_level';
COMMENT ON COLUMN lesson_sessions.difficulty_progression IS 'JSON object tracking difficulty adjustments throughout session';
COMMENT ON COLUMN lesson_sessions.session_growth_breakdown IS 'JSON object with: base_correct, hint_penalty, time_bonus, vocab_bonus, total_growth';

-- Create index for faster queries on avg_response_time
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_response_time
ON lesson_sessions(avg_response_time_ms)
WHERE avg_response_time_ms IS NOT NULL;

-- Create index for hebrew_translation_requests
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_hebrew_requests
ON lesson_sessions(hebrew_translation_requests)
WHERE hebrew_translation_requests > 0;
