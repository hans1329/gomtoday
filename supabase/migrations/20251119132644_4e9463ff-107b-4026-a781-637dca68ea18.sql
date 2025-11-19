-- 등장인물로 포함된 일기를 조회할 수 있는 RLS 정책 추가
CREATE POLICY "Users can view diaries they are mentioned in"
ON public.diaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(participants) AS participant
    WHERE (participant->>'id')::uuid = auth.uid()
  )
);