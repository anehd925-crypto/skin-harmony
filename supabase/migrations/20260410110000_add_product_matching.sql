-- products 테이블에 피부타입/고민 매칭 컬럼 추가
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS skin_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_concerns TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 기존 제품에 피부타입/고민 데이터 업데이트
UPDATE public.products SET
  skin_types = ARRAY['건성', '복합성'],
  skin_concerns = ARRAY['건조', '탄력'],
  description = '히알루론산으로 수분을 가득 채워주는 토너'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE public.products SET
  skin_types = ARRAY['건성', '지성', '복합성', '민감성'],
  skin_concerns = ARRAY['색소침착', '주름', '탄력'],
  description = '비타민C로 피부 톤을 밝혀주는 브라이트닝 세럼'
WHERE id = 'a2222222-2222-2222-2222-222222222222';

UPDATE public.products SET
  skin_types = ARRAY['건성', '지성', '복합성', '민감성'],
  skin_concerns = ARRAY['모공', '색소침착'],
  description = '일상에서 자외선으로부터 피부를 보호하는 선크림'
WHERE id = 'a3333333-3333-3333-3333-333333333333';

UPDATE public.products SET
  skin_types = ARRAY['봄웜', '가을웜'],
  skin_concerns = ARRAY['색소침착'],
  description = '웜톤 피부를 위한 자연스러운 글로우 쿠션'
WHERE id = 'a4444444-4444-4444-4444-444444444444';

UPDATE public.products SET
  skin_types = ARRAY['민감성', '건성'],
  skin_concerns = ARRAY['민감', '홍조', '여드름'],
  description = '자극받은 민감 피부를 진정시켜주는 시카 크림'
WHERE id = 'a5555555-5555-5555-5555-555555555555';

UPDATE public.products SET
  skin_types = ARRAY['건성', '지성', '복합성', '민감성'],
  skin_concerns = ARRAY['색소침착'],
  description = '가볍게 발리는 데일리 톤업 선에센스'
WHERE id = 'a6666666-6666-6666-6666-666666666666';
