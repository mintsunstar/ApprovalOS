-- 001_create_enums.sql
CREATE TYPE project_status AS ENUM ('draft', 'active', 'voting', 'approval', 'closed');
CREATE TYPE vote_type AS ENUM ('single', 'rank', 'score', 'combined');
CREATE TYPE user_role AS ENUM ('admin', 'reviewer', 'approver', 'viewer');
CREATE TYPE approval_type AS ENUM ('all', 'majority');
CREATE TYPE approval_action AS ENUM ('approved', 'rejected');
CREATE TYPE comment_type AS ENUM ('general', 'pin');
CREATE TYPE notification_type AS ENUM (
  'deadline_soon', 'new_comment', 'new_pin', 'result_open',
  'analysis_done', 'approval_requested', 'approval_done', 'rejected'
);
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE visibility_type AS ENUM ('internal', 'link');
CREATE TYPE approval_line_status AS ENUM ('pending', 'active', 'completed', 'rejected');
