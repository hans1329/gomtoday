-- Add admin policies for viewing all diaries
CREATE POLICY "Admins can view all diaries"
ON public.diaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Add admin policies for viewing all notebooks
CREATE POLICY "Admins can view all notebooks"
ON public.notebooks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);