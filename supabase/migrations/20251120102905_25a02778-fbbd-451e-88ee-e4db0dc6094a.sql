-- Create perspectives table for managing diary perspectives
CREATE TABLE public.perspectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  perspective_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.perspectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active perspectives"
ON public.perspectives
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can insert perspectives"
ON public.perspectives
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update perspectives"
ON public.perspectives
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete perspectives"
ON public.perspectives
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_perspectives_updated_at
BEFORE UPDATE ON public.perspectives
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default perspectives
INSERT INTO public.perspectives (perspective_key, label, cost, display_order) VALUES
  ('my_view', '나의 시선', 1, 1),
  ('camera', '나의 핸드폰', 2, 2),
  ('pet', '반려동물', 2, 3),
  ('friend', '친구', 2, 4),
  ('family', '가족', 2, 5),
  ('stranger', '지나가는 행인', 3, 6),
  ('old_man', '훗날의 나', 3, 7),
  ('future', '미래의 나', 3, 8);