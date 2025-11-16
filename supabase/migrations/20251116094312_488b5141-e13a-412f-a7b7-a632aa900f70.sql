-- Drop admin-only policies for brand-assets
DROP POLICY IF EXISTS "Admin users can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete brand assets" ON storage.objects;

-- Allow authenticated users to upload brand assets
CREATE POLICY "Authenticated users can upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets');

-- Allow authenticated users to update brand assets
CREATE POLICY "Authenticated users can update brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-assets')
WITH CHECK (bucket_id = 'brand-assets');

-- Allow authenticated users to delete brand assets
CREATE POLICY "Authenticated users can delete brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'brand-assets');