-- routines.name CHECK 제약을 morning | afternoon | evening 으로 확장
-- PostgreSQL은 CHECK 제약을 직접 수정할 수 없으므로 DROP 후 재추가

ALTER TABLE public.routines
  DROP CONSTRAINT IF EXISTS routines_name_check;

ALTER TABLE public.routines
  ADD CONSTRAINT routines_name_check
  CHECK (name IN ('morning', 'afternoon', 'evening'));
