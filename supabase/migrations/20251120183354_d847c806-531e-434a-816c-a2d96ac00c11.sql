-- Add admin policy for photos table
CREATE POLICY "Admins can view all photos"
ON public.photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);