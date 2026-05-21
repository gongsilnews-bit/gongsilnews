-- AI 초안 및 멀티채널 마케팅 원고 보관 테이블 생성
CREATE TABLE IF NOT EXISTS ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vacancy_id UUID REFERENCES vacancies(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('VACANCY', 'NEWS', 'MANUAL')),
  original_source TEXT,
  title TEXT,
  subtitle TEXT,
  content_article TEXT,
  content_blog TEXT,
  content_shorts TEXT,
  content_sns TEXT,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_ai_drafts_member_id ON ai_drafts(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_vacancy_id ON ai_drafts(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_created_at ON ai_drafts(created_at);

-- RLS 정책 설정 (사용자 보안 정책)
ALTER TABLE ai_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own drafts" 
  ON ai_drafts FOR INSERT 
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Users can view their own drafts" 
  ON ai_drafts FOR SELECT 
  USING (auth.uid() = member_id);

CREATE POLICY "Users can update their own drafts" 
  ON ai_drafts FOR UPDATE 
  USING (auth.uid() = member_id);

CREATE POLICY "Users can delete their own drafts" 
  ON ai_drafts FOR DELETE 
  USING (auth.uid() = member_id);
