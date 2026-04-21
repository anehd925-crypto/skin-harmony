-- ════════════════════════════════════════════════════════════════════════════
-- 운영 DB 정합성 패치 (배포 전 필수)
--
-- 누락된 마이그레이션을 한 번에 멱등 적용:
--   1) my_cabinet.image_url / product_url   (20260418000005 누락분)
--   2) analysis_history.skin_fit_score     (20260418000001 누락분)
--   3) products INSERT 정책 (인증 사용자) (20260418000006 누락분)
--
-- 모두 IF NOT EXISTS / DROP POLICY IF EXISTS 패턴이라 여러 번 실행해도 안전.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) my_cabinet 보관함 컬럼
ALTER TABLE public.my_cabinet
  ADD COLUMN IF NOT EXISTS image_url   text;

ALTER TABLE public.my_cabinet
  ADD COLUMN IF NOT EXISTS product_url text;

-- 2) analysis_history 매칭 점수 컬럼
ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS skin_fit_score integer;

-- 3) products INSERT 정책 (인증 사용자 누구나 신규 제품 등록 허용)
--    이미 존재하면 교체
DROP POLICY IF EXISTS "Authenticated users can insert products"
  ON public.products;

CREATE POLICY "Authenticated users can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4) 검증용 SELECT (실행 후 결과를 확인)
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='my_cabinet'
       AND column_name IN ('image_url','product_url')) AS my_cabinet_cols_added,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='analysis_history'
       AND column_name='skin_fit_score')               AS analysis_history_skin_fit_score,
  (SELECT COUNT(*) FROM pg_policy
     WHERE polrelid='public.products'::regclass
       AND polname='Authenticated users can insert products') AS products_insert_policy;
