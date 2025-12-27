-- Standalone script to remove lesson_sessions table and related objects
-- Run this directly in your Supabase SQL Editor

-- Drop trigger first
DROP TRIGGER IF EXISTS calculate_session_accuracy ON public.lesson_sessions;

-- Drop function
DROP FUNCTION IF EXISTS public.update_session_accuracy();

-- Drop table (this will automatically drop the RLS policies and indexes)
DROP TABLE IF EXISTS public.lesson_sessions CASCADE;

-- Verify the table is dropped
SELECT 'lesson_sessions table successfully removed!' as status;
