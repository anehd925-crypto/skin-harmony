-- profiles 테이블 세분화 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skin_sensitivity TEXT DEFAULT 'normal'
    CHECK (skin_sensitivity IN ('very_sensitive', 'sensitive', 'normal', 'resilient')),
  ADD COLUMN IF NOT EXISTS age_group TEXT DEFAULT ''
    CHECK (age_group IN ('10s', '20s', '30s', '40s', '50s_plus', '')),
  ADD COLUMN IF NOT EXISTS skin_condition TEXT DEFAULT 'normal'
    CHECK (skin_condition IN ('very_dry', 'dry', 'normal', 'oily', 'very_oily')),
  ADD COLUMN IF NOT EXISTS avoid_ingredients TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS concern_priority TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_goals TEXT[] DEFAULT '{}';

-- products 테이블에 연령대/민감도 적합성 컬럼 추가
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS suitable_sensitivity TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS suitable_age_groups TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avoid_skin_conditions TEXT[] DEFAULT '{}';

-- 기존 제품에 민감도/연령대 데이터 업데이트
UPDATE public.products SET
  suitable_sensitivity = ARRAY['very_sensitive', 'sensitive', 'normal', 'resilient'],
  suitable_age_groups = ARRAY['10s', '20s', '30s', '40s', '50s_plus']
WHERE category IN ('skincare', 'suncare', 'makeup');

UPDATE public.products SET
  suitable_sensitivity = ARRAY['very_sensitive', 'sensitive', 'normal', 'resilient']
WHERE id IN (
  'b3333333-3333-3333-3333-333333333333',
  'b5555555-5555-5555-5555-555555555555',
  'b9999999-9999-9999-9999-999999999999',
  'a5555555-5555-5555-5555-555555555555'
);

UPDATE public.products SET
  suitable_sensitivity = ARRAY['normal', 'resilient'],
  avoid_skin_conditions = ARRAY['very_dry']
WHERE id = 'b8888888-8888-8888-8888-888888888888';

UPDATE public.products SET
  suitable_age_groups = ARRAY['30s', '40s', '50s_plus']
WHERE id = 'b2222222-2222-2222-2222-222222222222';
