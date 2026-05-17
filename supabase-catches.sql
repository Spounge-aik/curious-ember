-- Fångstregistreringstabell
CREATE TABLE catches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fish_name text NOT NULL,
  fish_id text,
  length_cm numeric,
  weight_g numeric,
  caught_at timestamptz DEFAULT now(),
  image_url text,
  lake_name text,
  lake_id text,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own catches" ON catches
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket för fångstbilder
INSERT INTO storage.buckets (id, name, public) VALUES ('catch-images', 'catch-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload catch images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catch-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view catch images" ON storage.objects
  FOR SELECT USING (bucket_id = 'catch-images');

CREATE POLICY "Users can delete their own catch images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'catch-images' AND (storage.foldername(name))[1] = auth.uid()::text);
