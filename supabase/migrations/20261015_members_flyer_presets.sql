-- 유리창홍보지 "내 디자인" 3칸 — 회원이 맞춰 둔 배치(위치·크기·색·폰트·넣은 이미지)를 계정에 저장한다.
-- 매물마다 다른 값(금액·면적 등)은 저장하지 않는다. 다른 PC·다시 설치한 앱에서도 불러올 수 있게 계정(members)에 둔다.
-- 읽기·쓰기는 서버 API(/api/vacancy/flyer-presets)가 본인 것만 한다.
ALTER TABLE members ADD COLUMN IF NOT EXISTS flyer_presets JSONB NOT NULL DEFAULT '[]'::jsonb;
