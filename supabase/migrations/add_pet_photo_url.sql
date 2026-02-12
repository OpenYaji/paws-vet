-- Add photo_url column to pets table
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add comment to document the column
COMMENT ON COLUMN public.pets.photo_url IS 'URL to the pet''s photo stored in Supabase Storage';
