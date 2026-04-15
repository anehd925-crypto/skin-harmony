-- profiles 테이블에 낮탭 활성화 설정 컬럼 추가
-- Routine.tsx에서 afternoon_enabled 값을 기기 간 동기화하기 위해 사용

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS afternoon_enabled BOOLEAN NOT NULL DEFAULT true;
