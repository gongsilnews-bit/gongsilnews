-- 단지 정보 요청에 캡처 이미지 첨부 (2026-11-02 사장님: 부동산이 캡처해서 첨부 + 요청 글, 이미지는 WebP 로 압축해 받는다)
--  images: 이미지 주소 목록 ["https://…/apt-reports/…webp"] (vacancy_images 저장소 apt-reports/ 폴더)
--  field 'capture' — 캡처 요청 한 건. value 는 요청 글. 관리자가 보고 값을 넣어 반영한 뒤 처리 완료
--  Supabase → SQL Editor 에서 실행

ALTER TABLE apt_info_reports ADD COLUMN IF NOT EXISTS images jsonb;
