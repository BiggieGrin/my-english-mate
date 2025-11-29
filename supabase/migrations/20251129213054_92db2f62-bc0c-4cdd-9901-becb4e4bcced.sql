-- Add progress tracking columns to user_topics
ALTER TABLE public.user_topics
ADD COLUMN concept_score INTEGER DEFAULT 0 CHECK (concept_score >= 0 AND concept_score <= 100),
ADD COLUMN practice_score INTEGER DEFAULT 0 CHECK (practice_score >= 0 AND practice_score <= 100),
ADD COLUMN assessment_score INTEGER DEFAULT 0 CHECK (assessment_score >= 0 AND assessment_score <= 100),
ADD COLUMN overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
ADD COLUMN total_questions_answered INTEGER DEFAULT 0,
ADD COLUMN correct_answers INTEGER DEFAULT 0,
ADD COLUMN subtopics_covered JSONB DEFAULT '[]'::jsonb;

-- Create lesson_sessions table to track individual lesson completions
CREATE TABLE public.lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('learn', 'homework', 'exam_prep')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lesson_sessions
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.lesson_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.lesson_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.lesson_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_lesson_sessions_user_topic ON public.lesson_sessions(user_id, topic_id);
CREATE INDEX idx_lesson_sessions_conversation ON public.lesson_sessions(conversation_id);

-- Create function to update session accuracy
CREATE OR REPLACE FUNCTION public.update_session_accuracy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.questions_answered > 0 THEN
    NEW.accuracy = (NEW.correct_answers::DECIMAL / NEW.questions_answered::DECIMAL) * 100;
  ELSE
    NEW.accuracy = 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate accuracy
CREATE TRIGGER calculate_session_accuracy
  BEFORE INSERT OR UPDATE ON public.lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_accuracy();