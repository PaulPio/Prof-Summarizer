-- Allow users to update their own lectures (required for course_id assignment via drag-and-drop)
CREATE POLICY "Users can update their own lectures"
ON lectures
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
