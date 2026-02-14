-- Remove parent concept: drop parent_email from profiles and update handle_new_user

ALTER TABLE public.profiles DROP COLUMN IF EXISTS parent_email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    grade,
    english_level,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'grade' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'grade')::INTEGER
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'english_level',
    CASE
      WHEN NEW.raw_user_meta_data->>'full_name' IS NOT NULL
      THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile for new users. Sets onboarding_completed based on metadata presence.';
