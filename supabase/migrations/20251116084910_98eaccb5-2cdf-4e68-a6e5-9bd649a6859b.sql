-- photos 테이블에 diary_id 컬럼 추가 (일기와 연결)
ALTER TABLE public.photos
ADD COLUMN diary_id UUID REFERENCES public.diaries(id) ON DELETE CASCADE;

-- diaries 테이블의 photo_id를 nullable로 변경 (호환성 유지)
ALTER TABLE public.diaries
ALTER COLUMN photo_id DROP NOT NULL;

-- 사진 순서를 위한 컬럼 추가
ALTER TABLE public.photos
ADD COLUMN display_order INTEGER DEFAULT 0;