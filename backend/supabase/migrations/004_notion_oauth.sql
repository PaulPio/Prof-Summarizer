-- Notion OAuth tokens and Canvas connection metadata

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notion_oauth_access_enc TEXT,
  ADD COLUMN IF NOT EXISTS notion_oauth_refresh_enc TEXT,
  ADD COLUMN IF NOT EXISTS notion_workspace_id TEXT,
  ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT,
  ADD COLUMN IF NOT EXISTS notion_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canvas_user_name TEXT;
