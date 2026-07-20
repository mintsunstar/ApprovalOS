-- 009_create_pin_comments.sql
CREATE TABLE pin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES design_items(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES item_versions(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  pin_x DOUBLE PRECISION NOT NULL CHECK (pin_x >= 0 AND pin_x <= 1),
  pin_y DOUBLE PRECISION NOT NULL CHECK (pin_y >= 0 AND pin_y <= 1),
  pin_number INT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  page_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pin_comments_item ON pin_comments(item_id);
