-- ════════════════════════════════════════════════════════════════════════════
-- 옵션 B: routine_products → my_cabinet 이관 (데이터 단일화) - 안전 버전
--
-- 변경점 (v2)
--  - DO 블록으로 감싸 routines/routine_products 테이블 부재 시 자동 스킵
--  - 윈도우 함수 + DISTINCT ON 조합 제거 → 단순 GROUP BY로 정리
--  - INSERT/UPDATE 건수를 RAISE NOTICE로 출력하여 결과 추적 가능
--
-- 멱등성: 반복 실행해도 중복 INSERT 없음 (이름+브랜드 NOT EXISTS 가드)
-- 원본 보존: routines, routine_products는 삭제하지 않음
-- ════════════════════════════════════════════════════════════════════════════

DO $migration$
DECLARE
  has_routines           boolean;
  has_routine_products   boolean;
  inserted_count         integer := 0;
  updated_count          integer := 0;
BEGIN
  -- 1) 원본 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'routines'
  ) INTO has_routines;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'routine_products'
  ) INTO has_routine_products;

  IF NOT (has_routines AND has_routine_products) THEN
    RAISE NOTICE '[skip] routines 또는 routine_products 테이블이 없어 이관을 건너뜁니다.';
    RETURN;
  END IF;

  -- 2) 이관 대상 정규화 (이름+브랜드 기준 GROUP BY)
  --    - 같은 (user_id, name, brand) 조합은 한 행으로 통합
  --    - is_morning/is_evening은 OR 통합 (morning + evening 둘 다 있으면 모두 true)
  --    - 표시용 컬럼은 가장 최근(added_at DESC)값을 사용
  WITH src AS (
    SELECT
      r.user_id,
      rp.product_name,
      NULLIF(rp.product_brand, '')                 AS product_brand,
      rp.analysis_history_id,
      (r.name IN ('morning', 'afternoon'))         AS is_morning,
      (r.name = 'evening')                         AS is_evening,
      rp.added_at
    FROM public.routine_products rp
    JOIN public.routines r ON r.id = rp.routine_id
    WHERE rp.product_name IS NOT NULL
      AND length(trim(rp.product_name)) > 0
  ),
  agg AS (
    SELECT
      user_id,
      lower(trim(coalesce(product_name, '')))      AS norm_name,
      lower(trim(coalesce(product_brand, '')))     AS norm_brand,
      (array_agg(product_name        ORDER BY added_at DESC NULLS LAST))[1] AS product_name,
      (array_agg(product_brand       ORDER BY added_at DESC NULLS LAST))[1] AS product_brand,
      (array_agg(analysis_history_id ORDER BY added_at DESC NULLS LAST))[1] AS analysis_history_id,
      bool_or(is_morning) AS is_morning,
      bool_or(is_evening) AS is_evening
    FROM src
    GROUP BY
      user_id,
      lower(trim(coalesce(product_name, ''))),
      lower(trim(coalesce(product_brand, '')))
  )
  INSERT INTO public.my_cabinet (
    user_id, product_name, product_brand,
    category, step_order,
    is_morning, is_evening,
    notes, analysis_history_id
  )
  SELECT
    a.user_id,
    a.product_name,
    a.product_brand,
    'skincare'::text                    AS category,
    2                                   AS step_order,
    COALESCE(a.is_morning, true)        AS is_morning,
    COALESCE(a.is_evening, true)        AS is_evening,
    '루틴 체커에서 자동 이관됨'         AS notes,
    a.analysis_history_id
  FROM agg a
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.my_cabinet mc
    WHERE mc.user_id = a.user_id
      AND lower(trim(coalesce(mc.product_name, '')))  = a.norm_name
      AND lower(trim(coalesce(mc.product_brand, ''))) = a.norm_brand
  );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- 3) 기존 보관함 항목에 analysis_history_id 누락분 보강
  WITH backfill AS (
    SELECT DISTINCT ON (mc.id)
      mc.id                       AS cabinet_id,
      rp.analysis_history_id      AS new_history_id
    FROM public.my_cabinet mc
    JOIN public.routine_products rp
      ON lower(trim(coalesce(rp.product_name, '')))
         = lower(trim(coalesce(mc.product_name, '')))
     AND lower(trim(coalesce(rp.product_brand, '')))
         = lower(trim(coalesce(mc.product_brand, '')))
    JOIN public.routines r
      ON r.id = rp.routine_id
     AND r.user_id = mc.user_id
    WHERE mc.analysis_history_id IS NULL
      AND rp.analysis_history_id IS NOT NULL
    ORDER BY mc.id, rp.added_at DESC
  )
  UPDATE public.my_cabinet mc
  SET analysis_history_id = b.new_history_id
  FROM backfill b
  WHERE mc.id = b.cabinet_id
    AND mc.analysis_history_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '[done] my_cabinet에 % 건 INSERT, 기존 % 건에 analysis_history_id 보강',
    inserted_count, updated_count;
END $migration$;

-- ────────────────────────────────────────────────────────────────────────────
-- 안내: 본 마이그레이션은 원본 테이블(routines, routine_products)을 보존합니다.
-- 며칠 모니터링 후 안전이 확인되면 별도 마이그레이션에서 다음을 수행 가능:
--   DROP TABLE IF EXISTS public.routine_products CASCADE;
--   DROP TABLE IF EXISTS public.routines CASCADE;
-- ────────────────────────────────────────────────────────────────────────────
