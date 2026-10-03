-- 중개사무소 1곳 = 부동산 신청 1개 (2026-10-03)
-- 구글 아이디를 여러 개 만들어 같은 사무소로 무료 가입하는 것을 막는 DB 최종 안전장치.
-- 화면·서버 검사(src/app/admin/actions.ts adminUpdateAgency)를 피해 가도 여기서 막힌다.
--
-- 이미 가입한 계정은 건드리지 않는다:
--   - 아래 트리거는 "새로 신청할 때" 와 "등록번호를 바꿀 때" 만 검사한다.
--   - 그래서 지금 같은 번호로 여러 개 있는 계정이 있어도 이 SQL 은 실패하지 않고, 그 계정들의 정보 수정도 막지 않는다.

-- 1) 등록번호·사업자번호를 숫자만 남긴 칸 (하이픈·띄어쓰기·"제/호" 차이를 없앤다)
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS reg_num_norm text GENERATED ALWAYS AS (regexp_replace(coalesce(reg_num, ''), '[^0-9]', '', 'g')) STORED;
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS biz_num_norm text GENERATED ALWAYS AS (regexp_replace(coalesce(biz_num, ''), '[^0-9]', '', 'g')) STORED;

CREATE INDEX IF NOT EXISTS agencies_reg_num_norm_idx ON agencies (reg_num_norm);
CREATE INDEX IF NOT EXISTS agencies_biz_num_norm_idx ON agencies (biz_num_norm);

-- 2) 같은 등록번호로 신청 중(PENDING)·승인(APPROVED)인 다른 계정이 있으면 막는다
CREATE OR REPLACE FUNCTION agencies_block_duplicate_reg_num()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_norm text := regexp_replace(coalesce(NEW.reg_num, ''), '[^0-9]', '', 'g');
  old_norm text;
BEGIN
  IF length(new_norm) < 5 THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    old_norm := regexp_replace(coalesce(OLD.reg_num, ''), '[^0-9]', '', 'g');
    IF old_norm = new_norm THEN
      RETURN NEW; -- 등록번호를 그대로 두고 다른 정보만 고치는 경우 (기존 계정 포함) 는 검사하지 않는다
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.reg_num_norm = new_norm
      AND a.status IN ('PENDING', 'APPROVED')
      AND a.owner_id <> NEW.owner_id
  ) THEN
    RAISE EXCEPTION '이미 가입된 중개사무소입니다. 중개사무소 한 곳당 부동산회원 계정은 하나만 만들 수 있습니다.'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agencies_block_duplicate_reg_num ON agencies;
CREATE TRIGGER agencies_block_duplicate_reg_num
  BEFORE INSERT OR UPDATE OF reg_num ON agencies
  FOR EACH ROW EXECUTE FUNCTION agencies_block_duplicate_reg_num();
