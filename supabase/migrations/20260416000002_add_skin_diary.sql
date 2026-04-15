-- skin_diary: 날짜별 피부 상태 일기
CREATE TABLE IF NOT EXISTS public.skin_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  skin_score INTEGER NOT NULL CHECK (skin_score BETWEEN 1 AND 5),
  trouble_spots TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.skin_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skin_diary_own" ON public.skin_diary FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_skin_diary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skin_diary_updated_at
  BEFORE UPDATE ON public.skin_diary
  FOR EACH ROW EXECUTE FUNCTION update_skin_diary_updated_at();
