-- Create table for lesson images
CREATE TABLE public.lesson_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_data TEXT NOT NULL, -- base64 encoded image
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_images ENABLE ROW LEVEL SECURITY;

-- Users can insert their own images
CREATE POLICY "Users can insert their own images"
ON public.lesson_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own images
CREATE POLICY "Users can view their own images"
ON public.lesson_images
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON public.lesson_images
FOR DELETE
USING (auth.uid() = user_id);

-- Add image_id column to lesson_messages
ALTER TABLE public.lesson_messages
ADD COLUMN image_id UUID REFERENCES public.lesson_images(id) ON DELETE SET NULL;