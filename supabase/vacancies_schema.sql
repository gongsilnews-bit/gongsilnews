-- ================================================================
-- 공실(Vacancy) 테이블 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. vacancies 메인 테이블
CREATE TABLE IF NOT EXISTS vacancies (
  -- 식별
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_no      SERIAL UNIQUE,

  -- 등록자
  owner_id        UUID NOT NULL REFERENCES members(id),
  owner_role      TEXT NOT NULL DEFAULT 'USER',

  -- 매물 분류
  property_type   TEXT NOT NULL,
  sub_category    TEXT,

  -- 거래 정보
  trade_type      TEXT NOT NULL,
  deposit         BIGINT DEFAULT 0,
  monthly_rent    BIGINT DEFAULT 0,
  maintenance_fee BIGINT DEFAULT 0,

  -- 중개보수
  commission_type TEXT DEFAULT '법정수수료',
  commission_amount TEXT,
  commission_etc  TEXT,

  -- 면적
  supply_m2       NUMERIC(10,2),
  supply_py       NUMERIC(10,1),
  exclusive_m2    NUMERIC(10,2),
  exclusive_py    NUMERIC(10,1),

  -- 주거형 필드
  room_count      INTEGER DEFAULT 1,
  bath_count      INTEGER DEFAULT 1,
  direction       TEXT DEFAULT '남향',

  -- 상업형 필드
  current_floor   TEXT,
  total_floor     TEXT,

  -- 기타 정보
  parking         TEXT DEFAULT '없음',
  move_in_date    TEXT DEFAULT '즉시입주(공실)',
  options         TEXT[] DEFAULT '{}',

  -- 위치/주소
  sido            TEXT,
  sigungu         TEXT,
  dong            TEXT,
  detail_addr     TEXT,
  building_name   TEXT,
  apt_dong        TEXT,
  hosu            TEXT,
  address_exposure TEXT DEFAULT '기본주소만공개',

  -- 좌표
  lat             FLOAT8,
  lng             FLOAT8,

  -- 의뢰인 정보
  client_name     TEXT,
  client_phone    TEXT,
  owner_relation  TEXT DEFAULT '본인',

  -- 전달사항
  description     TEXT,

  -- 부동산회원 전용 필드
  realtor_commission TEXT,
  exposure_type   TEXT DEFAULT '부동산노출',
  landlord_name   TEXT,
  landlord_phone  TEXT,
  landlord_memo   TEXT,

  -- 상태 관리
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  consent         BOOLEAN DEFAULT TRUE,

  -- 인프라 (JSON)
  infrastructure  JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_vacancies_owner ON vacancies(owner_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_location ON vacancies(sido, sigungu, dong);
CREATE INDEX IF NOT EXISTS idx_vacancies_trade ON vacancies(trade_type);
CREATE INDEX IF NOT EXISTS idx_vacancies_created ON vacancies(created_at DESC);

-- 2. vacancy_photos 사진 테이블
CREATE TABLE IF NOT EXISTS vacancy_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id  UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacancy_photos_vacancy ON vacancy_photos(vacancy_id);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_vacancy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vacancy_updated_at
  BEFORE UPDATE ON vacancies
  FOR EACH ROW
  EXECUTE FUNCTION update_vacancy_updated_at();

-- 4. RLS 활성화
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancy_photos ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 (Service Role Key 사용 시에는 bypass됨)
-- 서비스 키로 접근하므로 우선 permissive 정책만 설정
CREATE POLICY "vacancies_all" ON vacancies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vacancy_photos_all" ON vacancy_photos FOR ALL USING (true) WITH CHECK (true);
