-- Enable RLS on conversations table (if not already enabled)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations
  FOR SELECT
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can insert their own conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  USING ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  USING ((auth.uid())::text = (user_id)::text);
