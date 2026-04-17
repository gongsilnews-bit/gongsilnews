-- map_blocks 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS map_blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  sido        TEXT,
  sigungu     TEXT,
  dong        TEXT,
  coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
  color       TEXT DEFAULT '#0066cc',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS 비활성화 (서비스 키 사용)
ALTER TABLE map_blocks ENABLE ROW LEVEL SECURITY;

-- 서비스 키로 모든 작업 허용
CREATE POLICY "Service key full access" ON map_blocks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_map_blocks_sido ON map_blocks(sido);
CREATE INDEX IF NOT EXISTS idx_map_blocks_active ON map_blocks(is_active);
