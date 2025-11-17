-- Add participants column to diaries table to store diary participants
ALTER TABLE public.diaries 
ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.diaries.participants IS '일기 등장인물 목록 (user_id와 name 배열)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_diaries_participants ON public.diaries USING gin(participants);