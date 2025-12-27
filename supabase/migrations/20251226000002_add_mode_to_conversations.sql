-- Add mode column to conversations table
ALTER TABLE conversations
ADD COLUMN mode TEXT DEFAULT 'לימוד';

-- Add comment to explain the column
COMMENT ON COLUMN conversations.mode IS 'Learning mode for the conversation: לימוד (learn), שיעורי בית (homework), or הכנה למבחן (exam_prep)';
