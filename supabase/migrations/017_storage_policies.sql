-- 017_storage_policies.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY designs_upload ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'designs' AND auth.role() = 'authenticated');

CREATE POLICY designs_read ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

CREATE POLICY designs_update ON storage.objects FOR UPDATE
USING (bucket_id = 'designs' AND auth.role() = 'authenticated');

CREATE POLICY designs_delete ON storage.objects FOR DELETE
USING (bucket_id = 'designs' AND auth.role() = 'authenticated');
