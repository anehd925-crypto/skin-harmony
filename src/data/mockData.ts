export interface Ingredient {
  name: string;
  nameKr: string;
  safety: 'safe' | 'caution' | 'danger';
  description: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'skincare' | 'suncare' | 'makeup';
  imageUrl: string;
  ingredients: Ingredient[];
  rating: number;
}

export const SKIN_TYPES = ['건성', '지성', '복합성', '민감성'] as const;
export const SKIN_CONCERNS = ['모공', '주름', '색소침착', '여드름', '건조', '탄력', '민감', '홍조'] as const;
export const PERSONAL_COLORS = ['봄웜', '여름쿨', '가을웜', '겨울쿨', '모름'] as const;

export type SkinType = typeof SKIN_TYPES[number];
export type SkinConcern = typeof SKIN_CONCERNS[number];
export type PersonalColor = typeof PERSONAL_COLORS[number];

export interface UserProfile {
  skinType: SkinType | null;
  skinConcerns: SkinConcern[];
  personalColor: PersonalColor | null;
  allergies: string[];
  onboardingComplete: boolean;
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name: '히알루론 수분 토너',
    brand: '글로우랩',
    category: 'skincare',
    imageUrl: '',
    rating: 4.5,
    ingredients: [
      { name: 'Hyaluronic Acid', nameKr: '히알루론산', safety: 'safe', description: '강력한 보습 성분으로 수분을 끌어당겨 피부에 수분을 공급합니다.' },
      { name: 'Niacinamide', nameKr: '나이아신아마이드', safety: 'safe', description: '피부 장벽 강화, 미백, 모공 축소에 효과적입니다.' },
      { name: 'Glycerin', nameKr: '글리세린', safety: 'safe', description: '피부 보습을 도와주는 안전한 성분입니다.' },
      { name: 'Butylene Glycol', nameKr: '부틸렌글라이콜', safety: 'caution', description: '보습 및 제형 안정 성분. 민감성 피부에 자극 가능.' },
      { name: 'Fragrance', nameKr: '향료', safety: 'danger', description: '알레르기 반응을 일으킬 수 있는 성분입니다.' },
    ],
  },
  {
    id: '2',
    name: '비타민C 브라이트닝 세럼',
    brand: '스킨랩',
    category: 'skincare',
    imageUrl: '',
    rating: 4.7,
    ingredients: [
      { name: 'Ascorbic Acid', nameKr: '아스코르빈산', safety: 'safe', description: '순수 비타민C. 항산화, 미백, 콜라겐 합성 촉진.' },
      { name: 'Tocopherol', nameKr: '토코페롤', safety: 'safe', description: '비타민E. 항산화 효과가 뛰어납니다.' },
      { name: 'Ferulic Acid', nameKr: '페룰산', safety: 'safe', description: '비타민C의 효과를 증가시키는 항산화 성분.' },
      { name: 'Ethanol', nameKr: '에탄올', safety: 'caution', description: '건조함과 자극을 유발할 수 있습니다.' },
    ],
  },
  {
    id: '3',
    name: 'UV 프로텍트 선크림 SPF50+',
    brand: '선가드',
    category: 'suncare',
    imageUrl: '',
    rating: 4.3,
    ingredients: [
      { name: 'Zinc Oxide', nameKr: '징크옥사이드', safety: 'safe', description: '물리적 자외선 차단제. 피부 자극이 적습니다.' },
      { name: 'Titanium Dioxide', nameKr: '이산화티타늄', safety: 'safe', description: '물리적 자외선 차단제.' },
      { name: 'Cetyl Alcohol', nameKr: '세틸알코올', safety: 'safe', description: '피부를 부드럽게 해주는 지방알코올.' },
      { name: 'Oxybenzone', nameKr: '옥시벤존', safety: 'danger', description: '호르몬 교란 우려가 있는 화학적 자외선 차단 성분.' },
    ],
  },
  {
    id: '4',
    name: '로즈 글로우 쿠션',
    brand: '블룸뷰티',
    category: 'makeup',
    imageUrl: '',
    rating: 4.1,
    ingredients: [
      { name: 'Dimethicone', nameKr: '디메치콘', safety: 'safe', description: '피부를 매끄럽게 해주는 실리콘 성분.' },
      { name: 'Iron Oxides', nameKr: '산화철', safety: 'safe', description: '색상을 내는 안전한 무기 색소.' },
      { name: 'Talc', nameKr: '탈크', safety: 'caution', description: '모공을 막을 수 있으며, 순도에 따라 안전성이 다릅니다.' },
      { name: 'Paraben', nameKr: '파라벤', safety: 'danger', description: '방부제. 호르몬 교란 우려가 있습니다.' },
    ],
  },
  {
    id: '5',
    name: '시카 리페어 크림',
    brand: '더마힐',
    category: 'skincare',
    imageUrl: '',
    rating: 4.6,
    ingredients: [
      { name: 'Centella Asiatica', nameKr: '병풀추출물', safety: 'safe', description: '진정 및 피부 재생에 탁월한 성분.' },
      { name: 'Madecassoside', nameKr: '마데카소사이드', safety: 'safe', description: '병풀 유래 성분. 상처 치유와 진정 효과.' },
      { name: 'Shea Butter', nameKr: '시어버터', safety: 'safe', description: '강력한 보습 및 피부 보호 성분.' },
      { name: 'Panthenol', nameKr: '판테놀', safety: 'safe', description: '비타민B5. 보습과 피부 장벽 강화.' },
    ],
  },
  {
    id: '6',
    name: '톤업 선에센스',
    brand: '글로우랩',
    category: 'suncare',
    imageUrl: '',
    rating: 4.4,
    ingredients: [
      { name: 'Niacinamide', nameKr: '나이아신아마이드', safety: 'safe', description: '피부 톤 개선 및 미백 효과.' },
      { name: 'Zinc Oxide', nameKr: '징크옥사이드', safety: 'safe', description: '물리적 자외선 차단제.' },
      { name: 'Ethylhexyl Methoxycinnamate', nameKr: '에칠헥실메톡시신나메이트', safety: 'caution', description: '화학적 자외선 차단 성분. 환경 호르몬 우려.' },
    ],
  },
];
