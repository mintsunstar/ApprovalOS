-- 020_admin_console.sql
-- Platform operator console (separate from workspace users.role = admin)

CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE workspace_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE notice_type AS ENUM ('banner', 'modal', 'email');
CREATE TYPE notice_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE incident_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

ALTER TABLE users ADD COLUMN IF NOT EXISTS status account_status NOT NULL DEFAULT 'active';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status workspace_status NOT NULL DEFAULT 'active';

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_limits (
  plan plan_type PRIMARY KEY,
  max_members INT NOT NULL,
  max_projects INT NOT NULL,
  storage_gb INT NOT NULL
);

INSERT INTO plan_limits (plan, max_members, max_projects, storage_gb) VALUES
  ('free', 5, 5, 1),
  ('pro', 30, 50, 50),
  ('enterprise', 9999, 9999, 9999)
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type notice_type NOT NULL DEFAULT 'banner',
  status notice_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'info',
  status incident_status NOT NULL DEFAULT 'investigating',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_flags (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT NOT NULL DEFAULT '',
  maintenance_until TIMESTAMPTZ
);

INSERT INTO system_flags (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE INDEX idx_admin_logs_created ON admin_logs(created_at DESC);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_workspaces_status ON workspaces(status);
