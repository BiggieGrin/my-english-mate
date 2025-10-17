-- Add INSERT policy to prevent direct profile creation
-- Only the trigger function should be able to insert profiles
CREATE POLICY "Prevent direct profile creation"
  ON public.profiles
  FOR INSERT
  WITH CHECK (false);