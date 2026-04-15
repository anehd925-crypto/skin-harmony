-- profiles 테이블에 특수 피부 조건 컬럼 추가
-- 임신부/아토피/로사세아 등 민감 조건은 성분 분석 시 강화된 경고 기준 적용

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS special_condition TEXT DEFAULT 'none'
    CHECK (special_condition IN ('none', 'pregnant', 'atopy', 'rosacea', 'sensitive_skin'));

COMMENT ON COLUMN public.profiles.special_condition IS
  '특수 피부 조건: none(해당없음), pregnant(임신/수유중), atopy(아토피), rosacea(로사세아), sensitive_skin(극건성민감)';
