-- Add UPDATE policy for photos bucket
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1]);