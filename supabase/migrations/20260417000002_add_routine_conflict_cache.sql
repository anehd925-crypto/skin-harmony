-- 루틴 안전도 캐시 테이블 (홈 카드에서 빠르게 읽기 위함)
CREATE TABLE IF NOT EXISTS routine_conflict_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 100,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  synergy_count INTEGER NOT NULL DEFAULT 0,
  top_conflict TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE routine_conflict_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_conflict_cache" ON routine_conflict_cache
  FOR ALL USING (auth.uid() = user_id);
