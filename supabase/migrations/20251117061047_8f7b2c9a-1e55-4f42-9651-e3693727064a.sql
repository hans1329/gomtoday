-- Add weather column to diaries table
ALTER TABLE public.diaries 
ADD COLUMN weather text;