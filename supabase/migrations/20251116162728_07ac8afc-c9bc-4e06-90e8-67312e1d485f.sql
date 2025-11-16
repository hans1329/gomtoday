-- Security definer 함수로 공개 일기 확인
CREATE OR REPLACE FUNCTION public.is_diary_public(_diary_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM diary_notebooks dn
    JOIN notebooks nb ON dn.notebook_id = nb.id
    WHERE dn.diary_id = _diary_id
    AND nb.visibility = 'public'
  )
$$;

-- diaries 테이블에 공개 일기 읽기 정책 추가
CREATE POLICY "Users can view public diaries"
ON public.diaries
FOR SELECT
USING (public.is_diary_public(id));