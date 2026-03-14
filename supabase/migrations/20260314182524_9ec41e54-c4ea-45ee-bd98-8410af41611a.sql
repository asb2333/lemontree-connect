
-- Create storage bucket for flyer photos
INSERT INTO storage.buckets (id, name, public) VALUES ('flyer-photos', 'flyer-photos', true);

-- Allow authenticated users to upload
CREATE POLICY "Auth users upload flyer photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flyer-photos');

-- Allow public read
CREATE POLICY "Public read flyer photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'flyer-photos');
