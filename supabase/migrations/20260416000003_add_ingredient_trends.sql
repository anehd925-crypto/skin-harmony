-- analysis_history의 ingredients JSONB 배열에서 인기 성분 집계
-- 전체 사용자 데이터를 익명으로 집계 (개인정보 노출 없음)

CREATE OR REPLACE FUNCTION public.get_ingredient_trends(
  p_limit INT DEFAULT 10,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  ingredient_name TEXT,
  total_count BIGINT,
  safe_count BIGINT,
  caution_count BIGINT,
  danger_count BIGINT,
  avg_irritancy NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    (ing->>'name') AS ingredient_name,
    COUNT(*)                                                         AS total_count,
    COUNT(*) FILTER (WHERE ing->>'safety' = 'safe')                 AS safe_count,
    COUNT(*) FILTER (WHERE ing->>'safety' = 'caution')              AS caution_count,
    COUNT(*) FILTER (WHERE ing->>'safety' = 'danger')               AS danger_count,
    ROUND(AVG((ing->>'irritancy')::NUMERIC), 1)                     AS avg_irritancy
  FROM public.analysis_history h,
       jsonb_array_elements(h.result->'ingredients') AS ing
  WHERE h.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (ing->>'name') IS NOT NULL
    AND (ing->>'name') != ''
  GROUP BY ingredient_name
  ORDER BY total_count DESC
  LIMIT p_limit;
$$;

-- 최근 분석 등급 분포
CREATE OR REPLACE FUNCTION public.get_grade_distribution(p_days INT DEFAULT 30)
RETURNS TABLE (
  grade TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH totals AS (
    SELECT COUNT(*)::NUMERIC AS total
    FROM public.analysis_history
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  )
  SELECT
    overall_grade AS grade,
    COUNT(*)      AS count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total FROM totals), 0), 1) AS percentage
  FROM public.analysis_history
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY overall_grade
  ORDER BY count DESC;
$$;
