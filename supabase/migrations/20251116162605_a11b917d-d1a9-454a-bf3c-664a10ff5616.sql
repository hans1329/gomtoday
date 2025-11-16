-- 무한 재귀를 일으키는 정책 삭제
DROP POLICY IF EXISTS "Users can view diaries in public notebooks" ON public.diaries;

-- diary_notebooks 테이블에 공개 노트북 읽기 정책 추가
CREATE POLICY "Users can view diary-notebook links for public notebooks"
ON public.diary_notebooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM notebooks
    WHERE notebooks.id = diary_notebooks.notebook_id
    AND notebooks.visibility = 'public'
  )
);