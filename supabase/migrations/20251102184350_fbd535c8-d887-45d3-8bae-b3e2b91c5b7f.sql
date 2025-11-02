-- Fix search_path for functions by recreating trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.lesson_messages;
DROP FUNCTION IF EXISTS update_conversation_last_message();

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON public.lesson_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();