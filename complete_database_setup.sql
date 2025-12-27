-- ============================================
-- COMPLETE DATABASE SETUP
-- All tables with RLS policies for My English Mate
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 1. PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  grade INTEGER CHECK (grade >= 1 AND grade <= 12),
  english_level TEXT CHECK (english_level IN ('beginner', 'intermediate', 'advanced')),
  parent_email TEXT,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  lessons_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent direct profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Prevent direct profile creation"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, grade, english_level, parent_email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'grade')::INTEGER,
    NEW.raw_user_meta_data->>'english_level',
    NEW.raw_user_meta_data->>'parent_email'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CURRICULUM_TOPICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.curriculum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  description TEXT,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view curriculum topics" ON public.curriculum_topics;
DROP POLICY IF EXISTS "Prevent direct curriculum topic modification" ON public.curriculum_topics;

CREATE POLICY "Anyone can view curriculum topics"
  ON public.curriculum_topics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Prevent direct curriculum topic modification"
  ON public.curriculum_topics
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_grade ON public.curriculum_topics(grade);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_curriculum_topics_updated_at ON public.curriculum_topics;
CREATE TRIGGER update_curriculum_topics_updated_at
  BEFORE UPDATE ON public.curriculum_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 3. USER_TOPICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  concept_score INTEGER DEFAULT 0 CHECK (concept_score >= 0 AND concept_score <= 100),
  practice_score INTEGER DEFAULT 0 CHECK (practice_score >= 0 AND practice_score <= 100),
  assessment_score INTEGER DEFAULT 0 CHECK (assessment_score >= 0 AND assessment_score <= 100),
  overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  total_questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  subtopics_covered JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own topics" ON public.user_topics;
DROP POLICY IF EXISTS "Users can enroll in topics" ON public.user_topics;
DROP POLICY IF EXISTS "Users can update their own topics" ON public.user_topics;
DROP POLICY IF EXISTS "Users can unenroll from topics" ON public.user_topics;

CREATE POLICY "Users can view their own topics"
  ON public.user_topics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in topics"
  ON public.user_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics"
  ON public.user_topics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unenroll from topics"
  ON public.user_topics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_topics_user_id ON public.user_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_topic_id ON public.user_topics(topic_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_topics_updated_at ON public.user_topics;
CREATE TRIGGER update_user_topics_updated_at
  BEFORE UPDATE ON public.user_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 4. CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_topic_id ON public.conversations(topic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- ============================================
-- 5. LESSON_IMAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own images" ON public.lesson_images;
DROP POLICY IF EXISTS "Users can insert their own images" ON public.lesson_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON public.lesson_images;

CREATE POLICY "Users can view their own images"
  ON public.lesson_images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON public.lesson_images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.lesson_images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 6. LESSON_MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.lesson_images(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.lesson_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.lesson_messages;

CREATE POLICY "Users can view their own messages"
  ON public.lesson_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.lesson_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_messages_user_topic ON public.lesson_messages(user_id, topic, created_at);
CREATE INDEX IF NOT EXISTS idx_lesson_messages_conversation_id ON public.lesson_messages(conversation_id);

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversations.last_message_at
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.lesson_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.lesson_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- 7. LESSON_SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_sessions (
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

-- Enable RLS
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.lesson_sessions;

CREATE POLICY "Users can view their own sessions"
  ON public.lesson_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.lesson_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.lesson_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_user_topic ON public.lesson_sessions(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_conversation ON public.lesson_sessions(conversation_id);

-- Function to update session accuracy
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
DROP TRIGGER IF EXISTS calculate_session_accuracy ON public.lesson_sessions;
CREATE TRIGGER calculate_session_accuracy
  BEFORE INSERT OR UPDATE ON public.lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_accuracy();
