-- photos 테이블에 공개 일기의 사진을 볼 수 있는 정책 추가
CREATE POLICY "Users can view photos of public diaries"
ON public.photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM diaries d
    JOIN diary_notebooks dn ON d.id = dn.diary_id
    JOIN notebooks nb ON dn.notebook_id = nb.id
    WHERE (photos.diary_id = d.id OR photos.id = d.photo_id)
    AND nb.visibility = 'public'
  )
);