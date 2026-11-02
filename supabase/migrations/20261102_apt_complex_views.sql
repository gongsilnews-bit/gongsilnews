-- 시세 지도 단지 조회수 (2026-11-02 사장님: 단지가 보이면 공실등록 유도 — 숫자는 실제로 센 것만)
--  단지 상세 창이 열릴 때 그날 칸을 1 올린다. 같은 브라우저는 하루 한 번만 센다 (화면에서 막음).
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS apt_complex_views (
  complex_id text NOT NULL,
  day date NOT NULL,
  n int NOT NULL DEFAULT 0,
  PRIMARY KEY (complex_id, day)
);
ALTER TABLE apt_complex_views ENABLE ROW LEVEL SECURITY; -- 서버(서비스 키)만

CREATE OR REPLACE FUNCTION bump_apt_view(cid text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO apt_complex_views (complex_id, day, n) VALUES (cid, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
  ON CONFLICT (complex_id, day) DO UPDATE SET n = apt_complex_views.n + 1;
$$;
REVOKE ALL ON FUNCTION bump_apt_view(text) FROM PUBLIC, anon, authenticated;
