-- 지역 평균(시·도·시군구·동) 저장 (2026-11-18 사장님: 지역 고르기가 처음에 오래 걸림)
--  전국 실거래를 묶는 계산은 9~25초 걸리고, 서버 기억은 배포할 때마다 지워진다 → 계산 결과를 여기 저장해 두고 읽기만
--  하루 한 번 /api/cron/region-agg 가 새로 계산해 덮어쓴다 (src/utils/aptRegionAgg.ts storedRegionAgg)
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS region_agg (
  kind text PRIMARY KEY,          -- apt · offi · villa
  data jsonb NOT NULL,            -- { sido: [...], gu: [...], dong: [...] }
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE region_agg ENABLE ROW LEVEL SECURITY;
