-- ========================================
-- Phase 1: Analytics + Missions 인프라
-- ========================================

-- 1. 이벤트 추적 테이블
CREATE TABLE IF NOT EXISTS app_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name   text NOT NULL,
  event_props  jsonb,
  session_id   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_events_event_name_idx ON app_events(event_name);
CREATE INDEX IF NOT EXISTS app_events_user_id_idx    ON app_events(user_id);
CREATE INDEX IF NOT EXISTS app_events_created_at_idx ON app_events(created_at DESC);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- 누구나 insert 가능 (비로그인도 추적), 조회는 본인 것만
DROP POLICY IF EXISTS "anyone can insert events" ON app_events;
CREATE POLICY "anyone can insert events"
  ON app_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "users read own events" ON app_events;
CREATE POLICY "users read own events"
  ON app_events FOR SELECT
  USING (auth.uid() = user_id);


-- 2. 온보딩/리텐션 미션 테이블
CREATE TABLE IF NOT EXISTS user_missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_key   text NOT NULL,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_key)
);

CREATE INDEX IF NOT EXISTS user_missions_user_id_idx ON user_missions(user_id);

ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own missions" ON user_missions;
CREATE POLICY "users manage own missions"
  ON user_missions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. 알림 설정 확장 (profiles에 컬럼 추가)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_morning_routine  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_evening_routine  boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_report    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sale_alerts      boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_blacklist_alerts boolean DEFAULT true;


-- 4. 비슷한 피부 유저의 인기 제품 RPC
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
