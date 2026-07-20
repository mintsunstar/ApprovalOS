-- 016_rls_policies.sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read/update own profile
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id OR workspace_id IN (
  SELECT workspace_id FROM users WHERE id = auth.uid()
));
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- Workspace members
CREATE POLICY workspaces_member ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
);
CREATE POLICY workspaces_admin_update ON workspaces FOR UPDATE USING (
  id IN (SELECT workspace_id FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Projects in same workspace
CREATE POLICY projects_workspace ON projects FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
);

-- Public vote read by token (anon)
CREATE POLICY projects_public_read ON projects FOR SELECT USING (
  visibility = 'link' AND public_token IS NOT NULL
);

CREATE POLICY design_items_project ON design_items FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ))
);

CREATE POLICY notifications_own ON notifications FOR ALL USING (user_id = auth.uid());
