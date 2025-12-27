-- ============================================
-- COMPLETE RLS POLICIES SETUP
-- This migration ensures all tables have proper RLS policies
-- ============================================

-- ============================================
-- 1. CONVERSATIONS TABLE
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 2. CURRICULUM_TOPICS TABLE
-- ============================================
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 3. LESSON_IMAGES TABLE
-- ============================================
ALTER TABLE public.lesson_images ENABLE ROW LEVEL SECURITY;

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
-- 4. LESSON_MESSAGES TABLE
-- ============================================
ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 5. LESSON_SESSIONS TABLE
-- ============================================
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 6. PROFILES TABLE
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent direct profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Prevent direct INSERT (handled by trigger)
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

-- ============================================
-- 7. USER_TOPICS TABLE
-- ============================================
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

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
