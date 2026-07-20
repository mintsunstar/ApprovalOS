-- 012_create_approval_lines.sql
CREATE TABLE approval_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_name TEXT NOT NULL,
  approver_ids UUID[] NOT NULL DEFAULT '{}',
  approval_type approval_type NOT NULL DEFAULT 'all',
  status approval_line_status NOT NULL DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, step_order)
);

CREATE INDEX idx_approval_lines_project ON approval_lines(project_id);
