-- 013_create_approval_actions.sql
CREATE TABLE approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_line_id UUID NOT NULL REFERENCES approval_lines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action approval_action NOT NULL,
  selected_item_id UUID REFERENCES design_items(id) ON DELETE SET NULL,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(approval_line_id, user_id)
);
