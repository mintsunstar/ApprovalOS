-- 006_create_item_versions.sql
CREATE TABLE item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES design_items(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  change_note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, version_number)
);

ALTER TABLE design_items
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES item_versions(id) ON DELETE SET NULL;
