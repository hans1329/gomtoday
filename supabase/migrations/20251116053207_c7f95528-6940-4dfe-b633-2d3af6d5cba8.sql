-- Create brand-assets storage bucket for brand assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Allow anyone to view brand assets
CREATE POLICY "Public Access to Brand Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Only authenticated users can upload brand assets (admin only in practice)
CREATE POLICY "Authenticated users can upload brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets');