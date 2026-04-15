-- 전성분 분석 히스토리 테이블
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  product_brand TEXT NOT NULL DEFAULT '',
  ingredients_text TEXT NOT NULL,
  result JSONB NOT NULL,
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('good', 'moderate', 'bad')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.analysis_history FOR DELETE USING (auth.uid() = user_id);
