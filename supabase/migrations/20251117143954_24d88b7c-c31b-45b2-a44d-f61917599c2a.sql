-- Add pencil_count to profiles table
ALTER TABLE public.profiles
ADD COLUMN pencil_count integer NOT NULL DEFAULT 10;

-- Create pencil_settings table for admin configuration
CREATE TABLE public.pencil_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on pencil_settings
ALTER TABLE public.pencil_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for pencil_settings
CREATE POLICY "Anyone can view pencil settings"
ON public.pencil_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert pencil settings"
ON public.pencil_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pencil settings"
ON public.pencil_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pencil settings"
ON public.pencil_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.pencil_settings (setting_key, setting_value, description)
VALUES 
  ('signup_initial_pencils', 10, '회원가입시 초기 지급 연필 개수'),
  ('diary_write_cost', 1, '일기 작성시 차감 연필 개수'),
  ('photo_upload_cost', 0, '사진 업로드시 차감 연필 개수');

-- Update handle_new_user function to give initial pencils
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  initial_pencils integer;
BEGIN
  -- Get initial pencil count from settings
  SELECT setting_value INTO initial_pencils
  FROM public.pencil_settings
  WHERE setting_key = 'signup_initial_pencils';
  
  -- Default to 10 if setting not found
  IF initial_pencils IS NULL THEN
    initial_pencils := 10;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, pencil_count)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email, initial_pencils);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.notebooks (user_id, name, visibility, is_default)
  VALUES 
    (NEW.id, '나만의 일기장', 'private', true),
    (NEW.id, '공개 일기장', 'public', true);
  
  RETURN NEW;
END;
$function$;

-- Add trigger for updated_at on pencil_settings
CREATE TRIGGER update_pencil_settings_updated_at
BEFORE UPDATE ON public.pencil_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();