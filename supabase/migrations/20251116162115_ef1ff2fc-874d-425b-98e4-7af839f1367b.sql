-- Add RLS policy to allow viewing diaries in public notebooks
CREATE POLICY "Users can view diaries in public notebooks"
ON public.diaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM diary_notebooks dn
    JOIN notebooks nb ON dn.notebook_id = nb.id
    WHERE dn.diary_id = diaries.id
    AND nb.visibility = 'public'
  )
);