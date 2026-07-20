-- 003_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  company TEXT,
  title TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'reviewer',
  notification_prefs JSONB NOT NULL DEFAULT '{"deadline_soon":true,"new_comment":true,"new_pin":false,"approval_requested":true,"rejected":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_workspace ON users(workspace_id);
