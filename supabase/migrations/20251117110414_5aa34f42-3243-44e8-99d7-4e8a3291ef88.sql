-- Add perspective column to diaries table
ALTER TABLE public.diaries 
ADD COLUMN IF NOT EXISTS perspective text DEFAULT 'camera';

COMMENT ON COLUMN public.diaries.perspective IS '일기 작성 시점 (camera, pet, friend, family, stranger, future 등)';