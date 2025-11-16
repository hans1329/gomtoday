-- Allow users to view public profile information (name and photo) of other users
CREATE POLICY "Users can view public profile info of others"
ON public.profiles
FOR SELECT
USING (true);