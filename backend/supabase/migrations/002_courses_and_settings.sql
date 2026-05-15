-- Phase 0/1/2 Database Migration
-- Adds courses, user_settings, agent_jobs, canvas_materials, ai_call_log tables
-- and extends lectures with course_id

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Course/class organization
CREATE TABLE IF NOT EXISTS courses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  color              TEXT DEFAULT '#6366f1',
  canvas_course_id   TEXT,
  canvas_course_code TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_owner" ON courses USING (user_id = auth.uid());

-- Add course foreign key and auto-organizer suggestions to lectures
ALTER TABLE lectures
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_organizer_suggestions JSONB;
CREATE INDEX IF NOT EXISTS idx_lectures_course ON lectures(course_id);

-- User settings with encrypted credentials
CREATE TABLE IF NOT EXISTS user_settings (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  ai_provider              TEXT DEFAULT 'gemini',
  ai_model                 TEXT DEFAULT 'gemini-2.0-flash',
  gemini_api_key_enc       TEXT,
  openai_api_key_enc       TEXT,
  anthropic_api_key_enc    TEXT,
  openrouter_api_key_enc   TEXT,
  canvas_instance_url      TEXT,
  canvas_api_token_enc     TEXT,
  notion_token_enc         TEXT,
  notion_default_page_id   TEXT,
  agent_study_planner      BOOLEAN DEFAULT FALSE,
  agent_auto_organizer     BOOLEAN DEFAULT FALSE,
  agent_research           BOOLEAN DEFAULT FALSE,
  agent_multi_step         BOOLEAN DEFAULT FALSE,
  agent_pipeline_config    JSONB DEFAULT '[]',
  monthly_ai_spend_usd     NUMERIC(10,6) DEFAULT 0,
  last_agent_call_at       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_owner" ON user_settings USING (user_id = auth.uid());

-- Auto-update updated_at on user_settings changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agentic job tracking
CREATE TABLE IF NOT EXISTS agent_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id   UUID REFERENCES lectures(id) ON DELETE SET NULL,
  agent_type   TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',
  result       JSONB,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_jobs_owner" ON agent_jobs USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_status ON agent_jobs(user_id, status);

-- Canvas imported materials (metadata only, no binary content)
CREATE TABLE IF NOT EXISTS canvas_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
  canvas_file_id  TEXT,
  name            TEXT NOT NULL,
  mime_type       TEXT,
  storage_path    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE canvas_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_materials_owner" ON canvas_materials USING (user_id = auth.uid());

-- AI call logging for cost observability (admin-only read, no RLS)
CREATE TABLE IF NOT EXISTS ai_call_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature       TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  latency_ms    INTEGER,
  validation_ok BOOLEAN,
  cost_usd      NUMERIC(10,6),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Helper functions for API key encryption/decryption (service-role only)
CREATE OR REPLACE FUNCTION encrypt_api_key(plain_value TEXT, encryption_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT encode(pgp_sym_encrypt(plain_value, encryption_key)::bytea, 'base64');
$$;

CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_value TEXT, encryption_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgp_sym_decrypt(decode(encrypted_value, 'base64')::bytea, encryption_key);
$$;
