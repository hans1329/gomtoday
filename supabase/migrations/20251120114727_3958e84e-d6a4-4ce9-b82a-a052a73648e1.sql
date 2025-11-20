-- Fix perspectives table UPDATE policy to include WITH CHECK
DROP POLICY IF EXISTS "Admins can update perspectives" ON perspectives;

CREATE POLICY "Admins can update perspectives"
ON perspectives
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));