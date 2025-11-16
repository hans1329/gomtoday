-- Add UPDATE policy for diaries
CREATE POLICY "Users can update their own diaries"
ON diaries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for photos
CREATE POLICY "Users can update their own photos"
ON photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);