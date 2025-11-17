-- Add banned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN banned BOOLEAN NOT NULL DEFAULT false;

-- Add banned_at column to track when user was banned
ALTER TABLE public.profiles 
ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;

-- Add banned_reason column to track why user was banned
ALTER TABLE public.profiles 
ADD COLUMN banned_reason TEXT;

-- Create index for faster banned user queries
CREATE INDEX idx_profiles_banned ON public.profiles(banned);

-- Add RLS policy to prevent banned users from accessing the app
CREATE POLICY "Banned users cannot access"
ON public.diaries
FOR ALL
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.banned = true
  )
);

-- Add RLS policy to prevent banned users from viewing notebooks
CREATE POLICY "Banned users cannot view notebooks"
ON public.notebooks
FOR SELECT
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.banned = true
  )
);

-- Add RLS policy to prevent banned users from creating diaries
CREATE POLICY "Banned users cannot create diaries"
ON public.diaries
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.banned = true
  )
);

COMMENT ON COLUMN public.profiles.banned IS 'Whether the user is banned from the platform';
COMMENT ON COLUMN public.profiles.banned_at IS 'Timestamp when the user was banned';
COMMENT ON COLUMN public.profiles.banned_reason IS 'Reason why the user was banned';