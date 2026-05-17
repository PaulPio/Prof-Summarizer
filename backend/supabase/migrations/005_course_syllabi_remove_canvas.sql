-- Syllabus file metadata on courses + remove Canvas LMS artifacts.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS syllabus_file_path TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_file_name TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_mime TEXT,
  ADD COLUMN IF NOT EXISTS syllabus_uploaded_at TIMESTAMPTZ;

ALTER TABLE courses DROP COLUMN IF EXISTS canvas_course_id;
ALTER TABLE courses DROP COLUMN IF EXISTS canvas_course_code;

DROP TABLE IF EXISTS canvas_materials;

DROP POLICY IF EXISTS "Users upload own syllabus" ON storage.objects;
DROP POLICY IF EXISTS "Users read own syllabus" ON storage.objects;
DROP POLICY IF EXISTS "Users update own syllabus" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own syllabus" ON storage.objects;

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own syllabus"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users read own syllabus"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users update own syllabus"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'course-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users delete own syllabus"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

ALTER TABLE user_settings DROP COLUMN IF EXISTS canvas_instance_url;
ALTER TABLE user_settings DROP COLUMN IF EXISTS canvas_api_token_enc;
ALTER TABLE user_settings DROP COLUMN IF EXISTS canvas_user_name;
