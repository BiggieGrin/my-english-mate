-- Update handle_new_user function to support new onboarding flow
-- This function creates a profile for new users with optional metadata
-- If metadata exists (old flow), marks user as onboarding_completed = true
-- If no metadata (new flow), marks as onboarding_completed = false

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with onboarding_completed = false for new users
  -- Existing metadata fields will be populated if available (for backward compatibility)
  INSERT INTO public.profiles (
    id,
    full_name,
    grade,
    english_level,
    parent_email,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    -- Extract metadata if exists (backward compatibility with old registration flow)
    NEW.raw_user_meta_data->>'full_name',
    -- Convert grade to integer if exists, otherwise null
    CASE
      WHEN NEW.raw_user_meta_data->>'grade' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'grade')::INTEGER
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'english_level',
    NEW.raw_user_meta_data->>'parent_email',
    -- Smart onboarding flag: if metadata exists (old flow), mark as completed
    -- Otherwise (new flow), mark as not completed to trigger onboarding modal
    CASE
      WHEN NEW.raw_user_meta_data->>'full_name' IS NOT NULL
      THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$;

-- Add comment for function documentation
COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates profile for new users. Sets onboarding_completed based on metadata presence for backward compatibility.';
