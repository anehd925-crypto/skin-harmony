-- ════════════════════════════════════════════════════════════════════════════
-- 보관함 제품 이미지 URL 컬럼 추가
-- Phase 5: OpenGraph 스크랩으로 실제 상품 이미지를 저장
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE my_cabinet
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE my_cabinet
  ADD COLUMN IF NOT EXISTS product_url text;
