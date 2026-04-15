-- 내 피부 블랙리스트 테이블
-- 사용자의 분석 기록에서 위험 성분을 자동 학습하여 저장
CREATE TABLE IF NOT EXISTS skin_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,          -- 성분명 (한국어)
  ingredient_name_en TEXT,               -- 성분명 (영어/INCI)
  danger_count INTEGER NOT NULL DEFAULT 1,  -- 위험 등급으로 나타난 횟수
  caution_count INTEGER NOT NULL DEFAULT 0, -- 주의 등급으로 나타난 횟수
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_confirmed BOOLEAN DEFAULT false,    -- 사용자가 직접 확인한 항목
  UNIQUE(user_id, ingredient_name)
);

ALTER TABLE skin_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_blacklist" ON skin_blacklist
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_skin_blacklist_user ON skin_blacklist(user_id);
