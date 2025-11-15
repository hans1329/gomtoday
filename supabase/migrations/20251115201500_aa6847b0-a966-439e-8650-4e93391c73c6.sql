-- Make photos bucket public so external APIs can access the images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'photos';