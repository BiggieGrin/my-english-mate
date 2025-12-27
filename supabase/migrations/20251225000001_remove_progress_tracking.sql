-- Migration: Remove all progress tracking from user_topics and lesson_sessions
-- This removes overall_progress and all related progress scoring columns

-- Drop indexes related to progress tracking
DROP INDEX IF EXISTS idx_user_topics_overall_progress;
DROP INDEX IF EXISTS idx_user_topics_last_session;

-- Remove progress-related columns from user_topics table
ALTER TABLE user_topics
  DROP COLUMN IF EXISTS overall_progress,
  DROP COLUMN IF EXISTS concept_score,
  DROP COLUMN IF EXISTS practice_score,
  DROP COLUMN IF EXISTS assessment_score,
  DROP COLUMN IF EXISTS coverage_score,
  DROP COLUMN IF EXISTS accuracy_score,
  DROP COLUMN IF EXISTS fluency_score,
  DROP COLUMN IF EXISTS retention_score,
  DROP COLUMN IF EXISTS total_questions_answered,
  DROP COLUMN IF EXISTS correct_answers,
  DROP COLUMN IF EXISTS subtopics_covered,
  DROP COLUMN IF EXISTS subskills_mastered,
  DROP COLUMN IF EXISTS accuracy_log,
  DROP COLUMN IF EXISTS fluency_events;

-- Remove progress-related columns from lesson_sessions table if they exist
ALTER TABLE lesson_sessions
  DROP COLUMN IF EXISTS response_time_avg,
  DROP COLUMN IF EXISTS difficulty_level,
  DROP COLUMN IF EXISTS session_progress;

-- Note: We keep lesson_sessions table for statistics purposes
-- (it tracks actual session activity which is different from progress)
