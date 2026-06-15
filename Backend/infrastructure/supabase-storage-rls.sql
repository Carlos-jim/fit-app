-- Supabase Storage RLS policies for Bioma
-- Bucket: fit_bucket
-- Path convention: uploads/meals/{userId}/{timestamp}-{uuid}.{ext}
--
-- Run this in the Supabase SQL Editor after creating the bucket.
-- Note: the backend uses the service_role key, which bypasses RLS.
-- These policies are defense-in-depth for any future client-side access.

-- Allow authenticated users to read only their own meal images
CREATE POLICY "Users can read own meal images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fit_bucket'
  AND storage.foldername(name)[1] = 'uploads'
  AND storage.foldername(name)[2] = 'meals'
  AND storage.foldername(name)[3] = auth.uid()::text
);

-- Allow authenticated users to upload only to their own folder
CREATE POLICY "Users can upload own meal images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fit_bucket'
  AND storage.foldername(name)[1] = 'uploads'
  AND storage.foldername(name)[2] = 'meals'
  AND storage.foldername(name)[3] = auth.uid()::text
);

-- Allow authenticated users to update only their own files
CREATE POLICY "Users can update own meal images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fit_bucket'
  AND storage.foldername(name)[1] = 'uploads'
  AND storage.foldername(name)[2] = 'meals'
  AND storage.foldername(name)[3] = auth.uid()::text
);

-- Allow authenticated users to delete only their own files
CREATE POLICY "Users can delete own meal images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fit_bucket'
  AND storage.foldername(name)[1] = 'uploads'
  AND storage.foldername(name)[2] = 'meals'
  AND storage.foldername(name)[3] = auth.uid()::text
);
