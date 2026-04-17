-- ========================================
-- my_cabinet: 개인 평가(별점/리뷰) 컬럼 추가
-- ========================================
-- 이전 Phase 1 마이그레이션(20260418000002_add_analytics_and_missions.sql)의
-- get_similar_skin_popular_products RPC 함수가 my_cabinet.my_rating을 참조하는데,
-- 기본 my_cabinet 테이블(20260417000003)에는 해당 컬럼이 없어 함수 생성이 실패했다.
-- 이 패치는 누락된 컬럼을 보강하고, RPC 함수를 다시 생성한다.

ALTER TABLE my_cabinet
  ADD COLUMN IF NOT EXISTS my_rating  smallint
    CHECK (my_rating IS NULL OR (my_rating BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS my_review  text;

CREATE INDEX IF NOT EXISTS my_cabinet_rating_idx
  ON my_cabinet(user_id)
  WHERE my_rating IS NOT NULL;


-- "비슷한 피부 유저의 인기 제품" RPC 재생성
-- (이전 실행에서 실패해 미생성 상태일 수 있으므로 idempotent하게 다시 만든다.)
CREATE OR REPLACE FUNCTION get_similar_skin_popular_products(
  target_skin_type text,
  target_user_id uuid,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  product_name text,
  product_brand text,
  avg_rating numeric,
  review_count bigint,
  total_cabinet bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mc.product_name,
    mc.product_brand,
    ROUND(AVG(mc.my_rating)::numeric, 1) AS avg_rating,
    COUNT(mc.my_rating)                  AS review_count,
    COUNT(*)                             AS total_cabinet
  FROM my_cabinet mc
  JOIN profiles p ON p.user_id = mc.user_id
  WHERE p.skin_type = target_skin_type
    AND mc.user_id <> target_user_id
    AND mc.my_rating IS NOT NULL
  GROUP BY mc.product_name, mc.product_brand
  HAVING COUNT(mc.my_rating) >= 2
  ORDER BY AVG(mc.my_rating) DESC, COUNT(mc.my_rating) DESC
  LIMIT result_limit;
$$;
