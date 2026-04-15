-- products 테이블에 AI 자동 태깅 컬럼 추가
-- analyze-ingredients Edge Function이 분석 결과와 함께 productTags를 반환하면
-- ShareEntry/IngredientAnalysis에서 upsert 시 이 컬럼들에 저장됨

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS suitable_sensitivity TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS suitable_age_groups  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avoid_skin_conditions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_tagged_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS product_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ingredients_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS overall_grade TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';

-- product_url 기준 unique index (upsert 충돌 키)
CREATE UNIQUE INDEX IF NOT EXISTS products_product_url_idx
  ON public.products (product_url)
  WHERE product_url IS NOT NULL AND product_url <> '';
