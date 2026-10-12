-- 스마트스토어 결제 → 공실스터디 멤버십 자동 연동 (2026-10-12 회의 결정)
-- 상품: 공실스터디 1년 수강권 (판매자상품코드 GS-STUDY-1Y). 결제 1건 = 공실스터디부동산(study_premium) 1년.
-- 회원 찾기: 주문자 연락처 숫자 == members.phone 숫자. 스토어 정책상 옵션으로 휴대폰·이메일을 받지 못한다.
--
-- 상태 흐름: granted(자동 부여) | needs_review(회원을 못 찾았거나 여러 명) → 관리자 연결 시 granted
--            granted → revoked(취소·반품으로 회수) | revoke_review(회수해야 하는데 그새 등급이 바뀜) | ignored(관리자가 처리 안 하기로)
CREATE TABLE IF NOT EXISTS smartstore_orders (
  product_order_id   TEXT PRIMARY KEY,                                  -- 네이버 상품주문번호
  order_id           TEXT NOT NULL,                                     -- 네이버 주문번호
  product_id         TEXT,
  seller_product_code TEXT,
  quantity           INT NOT NULL DEFAULT 1,
  payment_amount     INT,
  naver_status       TEXT,                                              -- PAYED, DELIVERING, CANCELED ...
  orderer_name       TEXT,
  orderer_tel        TEXT,
  paid_at            TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'needs_review'
                     CHECK (status IN ('granted', 'needs_review', 'revoked', 'revoke_review', 'ignored')),
  review_reason      TEXT,                                              -- 관리자에게 보여줄 사유
  member_id          UUID REFERENCES members(id) ON DELETE SET NULL,
  -- 부여 직전 회원 등급. 취소되면 이 값으로 되돌린다.
  prev_role          TEXT,
  prev_plan_type     TEXT,
  prev_plan_start    TIMESTAMPTZ,
  prev_plan_end      TIMESTAMPTZ,
  granted_plan_end   TIMESTAMPTZ,                                       -- 이 주문으로 넣은 종료일. 회수할 때 그새 바뀌었는지 본다
  granted_at         TIMESTAMPTZ,
  dispatched_at      TIMESTAMPTZ,                                       -- 네이버에 발송처리(직접전달) 보고한 시각
  revoked_at         TIMESTAMPTZ,
  raw                JSONB,                                             -- 마지막으로 받은 네이버 주문 정보
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smartstore_orders_status_idx ON smartstore_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS smartstore_orders_member_idx ON smartstore_orders (member_id);

-- 주문 변경 조회를 어디까지 했는지 기억하는 곳
CREATE TABLE IF NOT EXISTS smartstore_sync_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 서버(서비스 키)만 읽고 쓴다.
ALTER TABLE smartstore_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartstore_sync_state ENABLE ROW LEVEL SECURITY;
