-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);

-- Storage policies for photos bucket
CREATE POLICY "Users can view their own photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);