-- 공실 ↔ 시세 지도 단지 잇기 (2026-11-02 사장님)
--  complex_id: apt_complexes.id 와 같은 규칙 — 아파트 "11680:논현동:276-1", 오피스텔 "o:11680:역삼동:832-3"
--  공실등록 때 주소 검색 결과(법정동 코드·지번)로 만들어 저장한다. 등록 화면은 그대로. 못 만들면 비워 둔다.
--  비어 있으면 지도에서 이름·거리로 맞춘다.
--  Supabase → SQL Editor 에서 실행

ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS complex_id text;
CREATE INDEX IF NOT EXISTS vacancies_complex_id ON vacancies (complex_id);
