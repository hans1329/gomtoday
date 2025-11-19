-- Allow users to view photos of diaries they are mentioned in
CREATE POLICY "Users can view photos of diaries they are mentioned in"
ON photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM diaries d
    WHERE (photos.diary_id = d.id OR photos.id = d.photo_id)
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(d.participants) AS participant
      WHERE (participant->>'id')::uuid = auth.uid()
    )
  )
);