-- 멤버가 자신의 멤버십을 삭제할 수 있도록 RLS 정책 추가
CREATE POLICY "Users can leave notebooks they are members of"
ON public.notebook_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);