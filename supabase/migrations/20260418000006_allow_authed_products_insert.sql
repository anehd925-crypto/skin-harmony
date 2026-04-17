-- =====================================================
-- products 테이블에 인증된 사용자의 INSERT/UPDATE 허용
-- =====================================================
-- 배경
-- - 검색·분석 결과의 제품을 "할인 알림"에 등록하려면 products 테이블에
--   해당 row가 먼저 존재해야 한다 (discount_alerts.product_id FK).
-- - 기존 정책은 SELECT 만 공개되어 있어, 클라이언트가 검색 결과만 가지고
--   직접 알림을 등록할 수 없었다.
-- - 본 마이그레이션은 인증된 사용자가 products row를 추가/갱신할 수 있도록
--   최소 정책을 부여한다 (DELETE는 허용하지 않음).
-- - 동일 (name, brand) 중복을 방지하기 위해 UNIQUE 인덱스도 함께 생성한다.

-- 1) name + brand 조합에 대한 UNIQUE 인덱스 (upsert 충돌 키)
--    공백 정규화 위해 lower(trim(...)) 기준의 함수형 인덱스 사용
CREATE UNIQUE INDEX IF NOT EXISTS products_name_brand_unique_idx
  ON public.products (
    lower(trim(coalesce(name, ''))),
    lower(trim(coalesce(brand, '')))
  )
  WHERE name IS NOT NULL AND brand IS NOT NULL AND name <> '' AND brand <> '';

-- 2) RLS 정책: 인증된 사용자만 INSERT 가능
DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
CREATE POLICY "Authenticated can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 최소 검증: 이름/브랜드 비어있지 않아야 함 (스팸 방지)
    name IS NOT NULL AND length(trim(name)) > 0
    AND brand IS NOT NULL AND length(trim(brand)) > 0
  );

-- 3) RLS 정책: 인증된 사용자가 기존 row 업데이트 가능 (분석 결과 보강용)
DROP POLICY IF EXISTS "Authenticated can update products" ON public.products;
CREATE POLICY "Authenticated can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
