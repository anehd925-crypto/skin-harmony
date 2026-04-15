-- 내 화장품 보관함 (My Cabinet)
-- 사용자가 실제 보유한 화장품 목록을 관리하는 테이블
CREATE TABLE IF NOT EXISTS my_cabinet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_brand TEXT,
  category TEXT NOT NULL DEFAULT 'skincare',
    -- skincare | suncare | makeup | treatment | body | hair
  step_order INTEGER DEFAULT 99,   -- 사용 순서 (낮을수록 먼저)
  is_morning BOOLEAN DEFAULT true,
  is_evening BOOLEAN DEFAULT true,
  is_opened BOOLEAN DEFAULT false,  -- 개봉 여부
  opened_at DATE,                   -- 개봉일 (유통기한 계산용)
  pao_months INTEGER,               -- 개봉 후 사용기간(개월)
  notes TEXT,
  analysis_history_id UUID REFERENCES analysis_history(id) ON DELETE SET NULL,
    -- 분석 기록에서 불러온 경우 연결
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE my_cabinet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_cabinet" ON my_cabinet
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_my_cabinet_user ON my_cabinet(user_id);
