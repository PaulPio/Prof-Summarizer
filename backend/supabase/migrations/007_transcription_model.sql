-- Optional separate provider/model for audio transcription (distinct from main AI provider).
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS transcription_provider TEXT,
  ADD COLUMN IF NOT EXISTS transcription_model TEXT;
