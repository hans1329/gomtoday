-- Add emoji column to diaries table
ALTER TABLE public.diaries ADD COLUMN emoji text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.diaries.emoji IS 'Casual emoji representing the diary mood/content';