-- 공실뉴스 2차 카테고리를 새 표준 명칭으로 통일한다.
-- 애플리케이션에도 구 명칭 조회 호환을 유지해 점진 배포 중 기사 누락을 막는다.
update public.articles
set section2 = case section2
  when '빌라/주택' then '빌라/주택/다가구/다세대'
  when '상가/사무실/공장/토지' then '상가/사무실/빌딩/공장/토지'
  else section2
end
where section1 in ('공실뉴스', '공실현장')
  and section2 in ('빌라/주택', '상가/사무실/공장/토지');
