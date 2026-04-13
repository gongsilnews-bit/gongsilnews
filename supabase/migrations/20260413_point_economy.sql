-- 1. members 테이블에 포인트 컬럼 추가
ALTER TABLE members
ADD COLUMN point_balance integer DEFAULT 0 NOT NULL;

-- 2. point_transactions 테이블 생성
CREATE TABLE point_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES members(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    transaction_type text NOT NULL, -- e.g. 'UPLOAD_REWARD', 'BUY_MATERIAL', 'SELL_MATERIAL', 'P2P_SEND', 'P2P_RECEIVE', 'ADMIN_ADJUST'
    description text,
    related_entity_id uuid, -- 게시물이나 타 유저 ID 등을 기록할 때 사용 (선택)
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 인덱스 추가 (회원별 포인트 조회 속도 최적화)
CREATE INDEX idx_point_transactions_member_id ON point_transactions(member_id);

-- 3. user_purchases 테이블 생성 (중복 구매 방지용 영수증)
CREATE TABLE user_purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id uuid REFERENCES members(id) ON DELETE CASCADE,
    content_type text NOT NULL, -- e.g. 'BOARD_POST', 'STUDY_LECTURE'
    content_id uuid NOT NULL, -- 참조 무결성을 강제하면 타입 섞일때 불편하므로 uuid만 유지
    price_paid integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (buyer_id, content_type, content_id) -- 동일 유저가 같은 글을 두 번 사지 못하게 막음 (유니크 제약조건)
);

-- 4. board_posts 에 필요 포인트(게시글 가격) 컬럼 추가
ALTER TABLE board_posts
ADD COLUMN price_points integer DEFAULT 0 NOT NULL;

-- 5. RPC (Stored Procedure) : 안전한 포인트 결제 트랜잭션 함수
-- 앱 서버(Next.js)에서 각 쿼리를 따로 날리면 중간에 실패했을 때 돈만 빠져나가거나 자료만 받는 버그가 생기므로
-- Supabase DB 안에서 하나의 트랜잭션으로 안전하게 결제하도록 RPC 함수를 만듭니다.
CREATE OR REPLACE FUNCTION purchase_content(
    p_buyer_id uuid,
    p_seller_id uuid,
    p_content_type text,
    p_content_id uuid,
    p_price integer,
    p_description text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_buyer_balance integer;
BEGIN
    -- 1. 구매자의 현재 잔액 확인 및 락킹 (Row-level lock)
    SELECT point_balance INTO v_buyer_balance 
    FROM members 
    WHERE id = p_buyer_id 
    FOR UPDATE;

    IF v_buyer_balance < p_price THEN
        RAISE EXCEPTION 'Not enough points';
    END IF;

    -- 2. 이미 구매한 이력이 있는지 확인 (옵션이나 UNIQUE 제약으로도 걸러짐)
    IF EXISTS (
        SELECT 1 FROM user_purchases 
        WHERE buyer_id = p_buyer_id 
          AND content_type = p_content_type 
          AND content_id = p_content_id
    ) THEN
        RAISE EXCEPTION 'Already purchased';
    END IF;

    -- 3. 구매자 포인트 차감
    UPDATE members 
    SET point_balance = point_balance - p_price 
    WHERE id = p_buyer_id;

    -- 4. 판매자 포인트 증가 (판매자가 존재할 경우에만, 예를 들어 'ADMIN'이면 없을 수 있음)
    IF p_seller_id IS NOT NULL THEN
        UPDATE members 
        SET point_balance = point_balance + p_price 
        WHERE id = p_seller_id;
    END IF;

    -- 5. 구매자 장부 기록
    INSERT INTO point_transactions (member_id, amount, transaction_type, description, related_entity_id)
    VALUES (p_buyer_id, -p_price, 'BUY_MATERIAL', p_description, p_content_id);

    -- 6. 판매자 장부 기록
    IF p_seller_id IS NOT NULL THEN
        INSERT INTO point_transactions (member_id, amount, transaction_type, description, related_entity_id)
        VALUES (p_seller_id, p_price, 'SELL_MATERIAL', p_description || ' (판매수익)', p_content_id);
    END IF;

    -- 7. 영수증 발급
    INSERT INTO user_purchases (buyer_id, content_type, content_id, price_paid)
    VALUES (p_buyer_id, p_content_type, p_content_id, p_price);

    RETURN true;
END;
$$;
