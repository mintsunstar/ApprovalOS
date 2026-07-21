-- 019_project_start_date_comment_images.sql
-- Align schema with demo app: project period start + comment image attachments
-- Also refresh notification_prefs default to 8 keys used by Account UI

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

COMMENT ON COLUMN projects.start_date IS '프로젝트 진행 시작일 (설정 화면 기간 달력). NULL이면 created_at을 UI에서 대체 표시';
COMMENT ON COLUMN projects.deadline IS '프로젝트 투표/진행 마감(종료)일';

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN comments.image_urls IS '댓글 첨부 이미지 URL 목록 (Storage 또는 데모 idb: 참조). 최대 4장 권장';
COMMENT ON COLUMN comments.content IS '본문. 이미지 전용 댓글은 빈 문자열 허용';

-- Refresh default for new users (existing rows keep their JSON until app merge)
ALTER TABLE users
  ALTER COLUMN notification_prefs SET DEFAULT '{
    "deadline_soon": true,
    "new_comment": true,
    "new_pin": false,
    "result_open": true,
    "analysis_done": true,
    "approval_requested": true,
    "approval_done": true,
    "rejected": true
  }'::jsonb;
