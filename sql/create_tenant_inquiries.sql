-- ============================================
-- 부동산 홈페이지 1:1 비밀 문의관리 (Tenant Inquiries)
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE SET NULL, -- 시스템 회원인 경우 연결
  
  -- 비회원도 작성 가능하므로 작성자/연락처 강제
  author_name TEXT NOT NULL,
  phone TEXT,
  
  source_title TEXT NOT NULL,          -- 예: "내 홈페이지 1:1문의", "어떤 매물 관련" 등
  content TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT TRUE,      -- 기본으로 비밀글
  
  is_read BOOLEAN DEFAULT FALSE,       -- 중개사가 확인했는지
  is_replied BOOLEAN DEFAULT FALSE,    -- 답변 완료했는지
  
  -- 만약 이 문의가 중개사의 '답글'이라면, 부모 문의 ID를 가리킴
  parent_id UUID REFERENCES tenant_inquiries(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 권한 설정 (RLS)
ALTER TABLE tenant_inquiries ENABLE ROW LEVEL SECURITY;

-- 모두가 문의를 "생성(작성)"할 수는 있어야 함
CREATE POLICY "누구나 문의 작성 가능" ON tenant_inquiries FOR INSERT WITH CHECK (true);

-- 해당 공인중개사(소유자)는 자기 홈페이지의 모든 문의 열람 및 수정/답글 가능
-- 하지만 우리는 service_role(관리자 권한)을 사용한 Server Action으로 우회 처리할 예정이므로
-- RLS는 엄격하게 유지해도 됩니다.

CREATE INDEX idx_tenant_inquiries_agency ON tenant_inquiries(agency_id);
CREATE INDEX idx_tenant_inquiries_created ON tenant_inquiries(created_at DESC);
