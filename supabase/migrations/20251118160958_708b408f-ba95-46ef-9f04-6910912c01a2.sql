-- Add AI assessment fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_assessment JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_assessment_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_study_minutes INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_assessment ON public.profiles(last_assessment_time);

-- Create function to update total study minutes
CREATE OR REPLACE FUNCTION public.update_total_study_minutes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Increment total_study_minutes by 1 for each message (approximately 1 minute per message)
  UPDATE public.profiles
  SET total_study_minutes = COALESCE(total_study_minutes, 0) + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update study minutes on new messages
DROP TRIGGER IF EXISTS trigger_update_study_minutes ON public.lesson_messages;
CREATE TRIGGER trigger_update_study_minutes
AFTER INSERT ON public.lesson_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_total_study_minutes();