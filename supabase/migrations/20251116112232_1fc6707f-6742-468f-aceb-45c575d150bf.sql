-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view shared notebooks" ON notebooks;

-- Create the correct policy
CREATE POLICY "Users can view shared notebooks"
ON notebooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM notebook_members
    WHERE notebook_members.notebook_id = notebooks.id
      AND notebook_members.user_id = auth.uid()
  )
);