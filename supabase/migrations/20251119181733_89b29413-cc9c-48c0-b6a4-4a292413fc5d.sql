-- Add status column to diaries table
ALTER TABLE public.diaries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_diaries_status ON public.diaries(status);

-- Update existing diaries that are connected to notebooks as published
UPDATE public.diaries
SET status = 'published'
WHERE id IN (
  SELECT DISTINCT diary_id 
  FROM public.diary_notebooks
);

COMMENT ON COLUMN public.diaries.status IS 'Diary status: draft (임시저장) or published (최종등록)';