-- Drop existing brand-assets upload policy
DROP POLICY IF EXISTS "Authenticated users can upload brand assets" ON storage.objects;

-- Create new policy for admin users to upload brand assets
CREATE POLICY "Admin users can upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin users to update brand assets
CREATE POLICY "Admin users can update brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'brand-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin users to delete brand assets
CREATE POLICY "Admin users can delete brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);