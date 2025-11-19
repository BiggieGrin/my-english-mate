-- Step 1: Migrate topics to curriculum_topics, getting grade from user profiles
INSERT INTO public.curriculum_topics (id, title, icon, description, grade, created_at, updated_at)
SELECT 
  t.id,
  t.title,
  t.icon,
  t.description,
  COALESCE(p.grade, 1) as grade, -- Use user's grade, default to 1 if not found
  t.created_at,
  t.updated_at
FROM public.topics t
LEFT JOIN public.profiles p ON t.user_id = p.id;

-- Step 2: Create user_topics entries for each existing topic
INSERT INTO public.user_topics (user_id, topic_id, started_at, last_accessed_at, created_at, updated_at)
SELECT 
  t.user_id,
  t.id as topic_id,
  t.created_at as started_at,
  t.updated_at as last_accessed_at,
  t.created_at,
  t.updated_at
FROM public.topics t;

-- Step 3: Drop the foreign key constraint from conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_topic_id_fkey;

-- Step 4: Add new foreign key constraint pointing to curriculum_topics
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_topic_id_fkey 
FOREIGN KEY (topic_id) REFERENCES public.curriculum_topics(id) ON DELETE CASCADE;

-- Step 5: Drop the old topics table
DROP TABLE IF EXISTS public.topics;