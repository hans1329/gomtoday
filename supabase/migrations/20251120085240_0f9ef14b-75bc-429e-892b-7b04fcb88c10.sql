-- Drop existing policy
DROP POLICY IF EXISTS "Users can create inquiries" ON public.inquiries;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Anyone can create inquiries"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Authenticated users must provide their own user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  -- Anonymous users can insert with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);