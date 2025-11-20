
-- Add admin select policy for perspectives to view all perspectives (including inactive ones)
CREATE POLICY "Admins can view all perspectives"
ON perspectives
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));
