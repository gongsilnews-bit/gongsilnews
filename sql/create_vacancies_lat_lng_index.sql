-- vacancies 테이블의 위경도 복합 B-Tree 인덱스 생성
-- status = 'ACTIVE' 인 매물만 필터링하여 인덱스 크기를 최소화하고 속도를 극대화합니다. (Partial Index)
CREATE INDEX IF NOT EXISTS idx_vacancies_lat_lng 
ON vacancies (lat, lng) 
WHERE status = 'ACTIVE';
