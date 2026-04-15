-- routines: 사용자의 아침/저녁 루틴
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name IN ('morning', 'evening')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- routine_products: 루틴에 포함된 제품 (analysis_history 연동)
CREATE TABLE IF NOT EXISTS public.routine_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  analysis_history_id UUID REFERENCES public.analysis_history(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_brand TEXT DEFAULT '',
  ingredients_snapshot TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routines_own" ON public.routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "routine_products_own" ON public.routine_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = routine_products.routine_id AND r.user_id = auth.uid()
    )
  );
