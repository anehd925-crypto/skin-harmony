-- 기존 제품 가격/올리브영명 업데이트
UPDATE public.products SET
  original_price = 8900, current_price = 8900, oliveyoung_name = '구달 어성초 진정 토너 패드'
WHERE id = 'b1111111-1111-1111-1111-111111111111';

UPDATE public.products SET
  original_price = 21000, current_price = 21000, oliveyoung_name = '아누아 어성초 77 세럼'
WHERE id = 'b7777777-7777-7777-7777-777777777777';

UPDATE public.products SET
  original_price = 18000, current_price = 14400, discount_rate = 20, is_on_sale = TRUE, oliveyoung_name = '라운드랩 자작나무 수분 크림'
WHERE id = 'b3333333-3333-3333-3333-333333333333';

UPDATE public.products SET
  original_price = 25000, current_price = 25000, oliveyoung_name = '코스알엑스 달팽이 에센스'
WHERE id = 'b4444444-4444-4444-4444-444444444444';

UPDATE public.products SET
  original_price = 32000, current_price = 25600, discount_rate = 20, is_on_sale = TRUE, oliveyoung_name = '닥터자르트 시카페어 크림'
WHERE id = 'b5555555-5555-5555-5555-555555555555';

UPDATE public.products SET
  original_price = 29000, current_price = 29000, oliveyoung_name = '이니스프리 그린티 씨드 세럼'
WHERE id = 'b6666666-6666-6666-6666-666666666666';

-- 추가 제품 36개 삽입 (총 50개)
INSERT INTO public.products (id, name, brand, category, description, skin_types, skin_concerns, suitable_sensitivity, suitable_age_groups, original_price, current_price, discount_rate, is_on_sale, oliveyoung_name, rating, avg_rating) VALUES

-- 스킨케어 (세럼)
('c0000001-0000-0000-0000-000000000001','멀티 바이옴 앰플','마녀공장','skincare','유산균 발효 성분으로 피부 장벽을 강화하는 앰플',ARRAY['민감성','건성'],ARRAY['민감','건조','탄력'],ARRAY['very_sensitive','sensitive','normal'],ARRAY['20s','30s'],24000,24000,0,FALSE,'마녀공장 멀티 바이옴 앰플',0,0),

('c0000002-0000-0000-0000-000000000002','비피다 바이옴 컨센트레이트 앰플','IOPE','skincare','피부 마이크로바이옴 강화 앰플',ARRAY['건성','민감성','복합성'],ARRAY['탄력','건조','민감'],ARRAY['sensitive','normal','resilient'],ARRAY['30s','40s'],52000,41600,20,TRUE,'IOPE 비피다 바이옴 컨센트레이트 앰플',0,0),

('c0000003-0000-0000-0000-000000000003','비타C 브라이트닝 세럼','닥터지','skincare','비타민C 유도체로 칙칙한 피부 톤을 밝혀주는 세럼',ARRAY['지성','복합성'],ARRAY['색소침착','모공','탄력'],ARRAY['normal','resilient'],ARRAY['20s','30s'],38000,30400,20,TRUE,'닥터지 비타C 세럼',0,0),

('c0000004-0000-0000-0000-000000000004','레티놀 0.1 크림','SOME BY MI','skincare','저농도 레티놀로 주름·탄력 케어',ARRAY['건성','복합성'],ARRAY['주름','탄력','건조'],ARRAY['normal','resilient'],ARRAY['30s','40s','50s_plus'],29000,29000,0,FALSE,'섬바이미 레티놀 0.1 크림',0,0),

('c0000005-0000-0000-0000-000000000005','히알루론산 세럼','토리든','skincare','5가지 히알루론산으로 속건없는 수분 공급',ARRAY['건성','민감성','복합성'],ARRAY['건조','민감'],ARRAY['very_sensitive','sensitive','normal','resilient'],ARRAY['10s','20s','30s'],19000,15200,20,TRUE,'토리든 다이브인 세럼',0,0),

-- 스킨케어 (크림/로션)
('c0000006-0000-0000-0000-000000000006','어성초 수딩 크림','구달','skincare','어성초와 티트리로 트러블 진정하는 젤 크림',ARRAY['지성','복합성','민감성'],ARRAY['여드름','민감','모공'],ARRAY['very_sensitive','sensitive','normal'],ARRAY['10s','20s','30s'],14000,14000,0,FALSE,'구달 어성초 크림',0,0),

('c0000007-0000-0000-0000-000000000007','시카 리커버 크림','제이준','skincare','시카와 세라마이드로 손상 피부 회복',ARRAY['민감성','건성'],ARRAY['민감','홍조','건조'],ARRAY['very_sensitive','sensitive'],ARRAY['20s','30s'],22000,17600,20,TRUE,'제이준 시카 리커버 크림',0,0),

('c0000008-0000-0000-0000-000000000008','콜라겐 수분 크림','미즈온','skincare','저분자 콜라겐 수분 크림',ARRAY['건성','복합성'],ARRAY['탄력','건조','주름'],ARRAY['normal','resilient'],ARRAY['30s','40s'],18000,18000,0,FALSE,'미즈온 콜라겐 크림',0,0),

('c0000009-0000-0000-0000-000000000009','프로폴리스 배리어 크림','COSRX','skincare','98% 프로폴리스로 피부 장벽 강화',ARRAY['건성','민감성'],ARRAY['건조','민감','탄력'],ARRAY['sensitive','normal'],ARRAY['20s','30s'],22000,22000,0,FALSE,'코스알엑스 프로폴리스 크림',0,0),

('c0000010-0000-0000-0000-000000000010','나이아신아마이드 10% + 징크 1% 세럼','The Ordinary','skincare','모공·피지 조절, 톤업 기능성 세럼',ARRAY['지성','복합성'],ARRAY['모공','여드름','색소침착'],ARRAY['normal','resilient'],ARRAY['10s','20s','30s'],12000,9600,20,TRUE,'더오디너리 나이아신아마이드 세럼',0,0),

-- 스킨케어 (토너/미스트)
('c0000011-0000-0000-0000-000000000011','시카 진정 토너','AHC','skincare','센텔라 아시아티카로 예민한 피부 진정',ARRAY['민감성','복합성'],ARRAY['홍조','민감','건조'],ARRAY['very_sensitive','sensitive','normal'],ARRAY['20s','30s'],16000,16000,0,FALSE,'AHC 시카 진정 토너',0,0),

('c0000012-0000-0000-0000-000000000012','갈락토미세스 발효 에센스','SOME BY MI','skincare','95% 갈락토미세스로 모공·윤기 케어',ARRAY['지성','복합성'],ARRAY['모공','여드름','색소침착'],ARRAY['normal','resilient'],ARRAY['20s','30s'],19000,15200,20,TRUE,'섬바이미 갈락토미세스 에센스',0,0),

('c0000013-0000-0000-0000-000000000013','수분 미스트','이니스프리','skincare','여행·외출 중 간편 수분 보충 미스트',ARRAY['건성','복합성','지성','민감성'],ARRAY['건조'],ARRAY['very_sensitive','sensitive','normal','resilient'],ARRAY['10s','20s','30s'],9000,9000,0,FALSE,'이니스프리 그린티 미스트',0,0),

('c0000014-0000-0000-0000-000000000014','AHA/BHA 클리어링 토너','COSRX','skincare','각질 제거와 모공 케어를 동시에',ARRAY['지성','복합성'],ARRAY['각질 제거','모공','여드름'],ARRAY['normal','resilient'],ARRAY['10s','20s'],17000,13600,20,TRUE,'코스알엑스 AHA/BHA 토너',0,0),

-- 스킨케어 (선케어)
('c0000015-0000-0000-0000-000000000015','선크림 SPF50+ PA++++','라운드랩','suncare','가볍고 백탁 없는 데일리 선크림',ARRAY['건성','복합성','민감성'],ARRAY['건조','민감'],ARRAY['very_sensitive','sensitive','normal','resilient'],ARRAY['10s','20s','30s'],14000,14000,0,FALSE,'라운드랩 독도 선크림',0,0),

('c0000016-0000-0000-0000-000000000016','톤업 선크림 SPF50+','닥터지','suncare','피부 톤 보정 + 자외선 차단 2in1',ARRAY['지성','복합성'],ARRAY['색소침착'],ARRAY['normal','resilient'],ARRAY['20s','30s'],18000,14400,20,TRUE,'닥터지 브라이트닝업 선크림',0,0),

('c0000017-0000-0000-0000-000000000017','에센스 선크림 SPF50+','이니스프리','suncare','수분 에센스 타입 선크림',ARRAY['건성','민감성'],ARRAY['건조','민감'],ARRAY['sensitive','normal'],ARRAY['20s','30s'],20000,20000,0,FALSE,'이니스프리 에코 세이프티 선크림',0,0),

('c0000018-0000-0000-0000-000000000018','에어리 핏 선크림 SPF50+','AHC','suncare','가볍게 밀착되는 얇은 필름 타입',ARRAY['지성','복합성'],ARRAY['모공'],ARRAY['normal','resilient'],ARRAY['20s','30s'],22000,17600,20,TRUE,'AHC 에어리 핏 선크림',0,0),

-- 클렌징
('c0000019-0000-0000-0000-000000000019','저자극 폼 클렌저','세타필','skincare','민감 피부용 저자극 클렌저',ARRAY['민감성','건성'],ARRAY['민감','홍조'],ARRAY['very_sensitive','sensitive','normal'],ARRAY['10s','20s','30s','40s'],14000,14000,0,FALSE,'세타필 젠틀 클렌저',0,0),

('c0000020-0000-0000-0000-000000000020','AHA 클레이 폼 클렌저','COSRX','skincare','모공 케어 클레이 폼',ARRAY['지성','복합성'],ARRAY['모공','여드름','각질 제거'],ARRAY['normal','resilient'],ARRAY['10s','20s'],12000,9600,20,TRUE,'코스알엑스 AHA 클레이 클렌저',0,0),

-- 색조 (베이스)
('c0000021-0000-0000-0000-000000000021','쿠션 파운데이션 SPF50+','헤라','makeup','고보습 쿠션 파운데이션',ARRAY['건성','복합성'],ARRAY['건조','탄력'],ARRAY['normal','resilient'],ARRAY['20s','30s'],45000,36000,20,TRUE,'헤라 블랙 쿠션',0,0),

('c0000022-0000-0000-0000-000000000022','가벼운 BB크림 SPF30','이니스프리','makeup','가볍고 촉촉한 데일리 BB크림',ARRAY['건성','복합성','민감성'],ARRAY['건조','색소침착'],ARRAY['sensitive','normal'],ARRAY['10s','20s','30s'],18000,18000,0,FALSE,'이니스프리 마이 쿠션 필터',0,0),

('c0000023-0000-0000-0000-000000000023','지속력 파운데이션','미샤','makeup','12시간 지속력 파운데이션',ARRAY['지성','복합성'],ARRAY['모공','색소침착'],ARRAY['normal','resilient'],ARRAY['20s','30s'],18000,14400,20,TRUE,'미샤 M 매직 쿠션',0,0),

('c0000024-0000-0000-0000-000000000024','프라이머 포어 미니마이저','Make pHD','makeup','모공 커버 + 메이크업 지속력',ARRAY['지성','복합성'],ARRAY['모공'],ARRAY['normal','resilient'],ARRAY['20s','30s'],29000,29000,0,FALSE,'메이크피에이치디 프라이머',0,0),

-- 색조 (포인트)
('c0000025-0000-0000-0000-000000000025','틴트 립밤','롬앤','makeup','촉촉한 발색의 틴트 립밤',ARRAY['건성','복합성','지성','민감성'],ARRAY['건조'],ARRAY['very_sensitive','sensitive','normal','resilient'],ARRAY['10s','20s','30s'],13000,13000,0,FALSE,'롬앤 쥬시 래스팅 틴트',0,0),

('c0000026-0000-0000-0000-000000000026','블러 셰이딩','클리오','makeup','자연스러운 입체감 셰이딩',ARRAY['건성','복합성','지성','민감성'],ARRAY['색소침착'],ARRAY['normal','resilient'],ARRAY['20s','30s'],16000,12800,20,TRUE,'클리오 쉐딩',0,0),

('c0000027-0000-0000-0000-000000000027','글로우 블러셔','페리페라','makeup','생기 있는 블러셔',ARRAY['건성','복합성','지성','민감성'],ARRAY[]::TEXT[],ARRAY['normal','resilient'],ARRAY['10s','20s'],12000,12000,0,FALSE,'페리페라 잉크 블러셔',0,0),

-- 마스크팩
('c0000028-0000-0000-0000-000000000028','히알루론산 수분 마스크','메디힐','skincare','집중 수분 공급 히알루론산 마스크팩',ARRAY['건성','복합성','민감성'],ARRAY['건조','민감'],ARRAY['very_sensitive','sensitive','normal'],ARRAY['10s','20s','30s','40s'],1500,1200,20,TRUE,'메디힐 히알루론산 마스크팩',0,0),

('c0000029-0000-0000-0000-000000000029','EGF 앰플 마스크','SNP','skincare','EGF·세라마이드 피부 재생 마스크',ARRAY['건성','민감성'],ARRAY['탄력','주름','건조'],ARRAY['sensitive','normal'],ARRAY['30s','40s'],2000,2000,0,FALSE,'SNP 골드 콜라겐 마스크',0,0),

('c0000030-0000-0000-0000-000000000030','BHA 모공 마스크','SOME BY MI','skincare','BHA 성분으로 모공 케어 집중 케어 마스크',ARRAY['지성','복합성'],ARRAY['모공','여드름','각질 제거'],ARRAY['normal','resilient'],ARRAY['10s','20s'],1800,1800,0,FALSE,'섬바이미 AHA BHA 마스크',0,0),

-- 헤어/바디 (가볍게 포함)
('c0000031-0000-0000-0000-000000000031','두피 스케일러','닥터포헤어','skincare','살리실산 두피 각질 케어',ARRAY['지성','복합성'],ARRAY['각질 제거','모공'],ARRAY['normal','resilient'],ARRAY['20s','30s'],16000,12800,20,TRUE,'닥터포헤어 폴리젠 두피 스케일러',0,0),

-- 아이크림
('c0000032-0000-0000-0000-000000000032','카페인 아이크림','The Ordinary','skincare','카페인으로 눈가 붓기 완화',ARRAY['건성','복합성','지성','민감성'],ARRAY['주름','탄력'],ARRAY['sensitive','normal','resilient'],ARRAY['20s','30s','40s'],12000,12000,0,FALSE,'더오디너리 카페인 아이 세럼',0,0),

('c0000033-0000-0000-0000-000000000033','레티놀 아이크림','닥터자르트','skincare','레티놀로 눈가 주름 집중 케어',ARRAY['건성','복합성'],ARRAY['주름','탄력','건조'],ARRAY['normal','resilient'],ARRAY['30s','40s','50s_plus'],42000,33600,20,TRUE,'닥터자르트 레티놀 아이크림',0,0),

-- 추가 기능성
('c0000034-0000-0000-0000-000000000034','글리콜산 7% 토닝 솔루션','The Ordinary','skincare','AHA 각질 제거 토닝 솔루션',ARRAY['복합성','지성'],ARRAY['각질 제거','모공','색소침착'],ARRAY['normal','resilient'],ARRAY['20s','30s'],10000,8000,20,TRUE,'더오디너리 글리콜산 토닝 솔루션',0,0),

('c0000035-0000-0000-0000-000000000035','아르간 페이스 오일','마녀공장','skincare','비건 아르간 오일 데일리 페이스 오일',ARRAY['건성','민감성'],ARRAY['건조','탄력','주름'],ARRAY['sensitive','normal'],ARRAY['30s','40s'],28000,28000,0,FALSE,'마녀공장 퓨어 클렌징 오일',0,0),

('c0000036-0000-0000-0000-000000000036','판테놀 수딩 젤','Dr.Ceuracle','skincare','90% 판테놀 수딩 젤',ARRAY['민감성','건성','지성'],ARRAY['홍조','민감','건조'],ARRAY['very_sensitive','sensitive','normal','resilient'],ARRAY['10s','20s','30s'],19000,15200,20,TRUE,'닥터스포뮬러 판테놀 수딩 젤',0,0);
