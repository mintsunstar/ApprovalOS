-- 011_create_ai_analyses.sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_summaries JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_summary TEXT NOT NULL DEFAULT '',
  sentiment JSONB NOT NULL DEFAULT '{"positive":0,"neutral":0,"negative":0}'::jsonb,
  brand_fit_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
