-- Create curriculum topics table (catalog of topics by grade)
CREATE TABLE public.curriculum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  description TEXT,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on curriculum_topics
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view curriculum topics (it's a catalog)
CREATE POLICY "Anyone can view curriculum topics"
ON public.curriculum_topics
FOR SELECT
TO authenticated
USING (true);

-- Only allow admins to insert/update/delete curriculum topics (for now, no one can modify)
CREATE POLICY "Prevent direct curriculum topic modification"
ON public.curriculum_topics
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create user_topics junction table (connects users to topics they're learning)
CREATE TABLE public.user_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS on user_topics
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

-- Users can view their own topic enrollments
CREATE POLICY "Users can view their own topics"
ON public.user_topics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can enroll in topics
CREATE POLICY "Users can enroll in topics"
ON public.user_topics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own topic enrollments
CREATE POLICY "Users can update their own topics"
ON public.user_topics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can unenroll from topics
CREATE POLICY "Users can unenroll from topics"
ON public.user_topics
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_curriculum_topics_grade ON public.curriculum_topics(grade);
CREATE INDEX idx_user_topics_user_id ON public.user_topics(user_id);
CREATE INDEX idx_user_topics_topic_id ON public.user_topics(topic_id);

-- Create trigger for automatic timestamp updates on curriculum_topics
CREATE TRIGGER update_curriculum_topics_updated_at
BEFORE UPDATE ON public.curriculum_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create trigger for automatic timestamp updates on user_topics
CREATE TRIGGER update_user_topics_updated_at
BEFORE UPDATE ON public.user_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();