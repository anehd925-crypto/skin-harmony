import { ExternalLink, ShoppingCart, Tag } from 'lucide-react';

interface PurchaseLinksProps {
  productName: string;
  productBrand?: string;
  productUrl?: string;
  currentPrice?: number | null;
  originalPrice?: number | null;
  discountRate?: number | null;
  isOnSale?: boolean;
}

interface StoreLink {
  name: string;
  shortName: string;
  logo: React.ReactNode;
  url: string;
  price?: number | null;
  badgeColor: string;
}

const OliveyoungLogo = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#44b055]">
    <span className="text-[8px] font-black text-white leading-none">OY</span>
  </div>
);

const CoupangLogo = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#c0392b]">
    <span className="text-[8px] font-black text-white leading-none">CP</span>
  </div>
);

const NaverLogo = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#03c75a]">
    <span className="text-[8px] font-black text-white leading-none">N</span>
  </div>
);

const PurchaseLinks = ({
  productName,
  productBrand,
  productUrl,
  currentPrice,
  originalPrice,
  discountRate,
  isOnSale,
}: PurchaseLinksProps) => {
  const searchQuery = encodeURIComponent(`${productBrand ? productBrand + ' ' : ''}${productName}`);

  const oliveyoungUrl = productUrl && productUrl.startsWith('http')
    ? productUrl
    : `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(productName)}`;

  const coupangUrl = `https://www.coupang.com/np/search?q=${searchQuery}`;
  const naverUrl   = `https://search.shopping.naver.com/search/all?query=${searchQuery}`;

  const stores: StoreLink[] = [
    {
      name: '올리브영',
      shortName: 'oliveyoung',
      logo: <OliveyoungLogo />,
      url: oliveyoungUrl,
      price: currentPrice,
      badgeColor: 'text-[#44b055]',
    },
    {
      name: '쿠팡',
      shortName: 'coupang',
      logo: <CoupangLogo />,
      url: coupangUrl,
      price: null,
      badgeColor: 'text-[#c0392b]',
    },
    {
      name: '네이버쇼핑',
      shortName: 'naver',
      logo: <NaverLogo />,
      url: naverUrl,
      price: null,
      badgeColor: 'text-[#03c75a]',
    },
  ];

  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">구매처 비교</p>
        {isOnSale && discountRate && discountRate > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
            <Tag className="h-2.5 w-2.5" />{Math.round(discountRate)}% 할인 중
          </span>
        )}
      </div>

      {/* 가격 정보 (올리브영 저장 데이터) */}
      {currentPrice && currentPrice > 0 && (
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">올리브영 기준가</p>
            {isOnSale && originalPrice && originalPrice > currentPrice ? (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  {originalPrice.toLocaleString('ko-KR')}원
                </span>
                <span className="text-base font-black text-destructive">
                  {currentPrice.toLocaleString('ko-KR')}원
                </span>
              </>
            ) : (
              <span className="text-base font-black text-foreground">
                {currentPrice.toLocaleString('ko-KR')}원
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            실제 가격은 구매 시점에 다를 수 있습니다
          </p>
        </div>
      )}

      {/* 쇼핑몰 링크 목록 */}
      <div className="space-y-2">
        {stores.map((store) => (
          <button
            key={store.shortName}
            onClick={() => handleOpen(store.url)}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-accent transition-colors group"
          >
            {store.logo}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{store.name}</p>
              {store.price && store.price > 0 ? (
                <p className={`text-xs font-bold ${store.badgeColor}`}>
                  {store.price.toLocaleString('ko-KR')}원
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">클릭하여 최저가 확인</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>바로가기</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        구매 링크를 탭하면 해당 쇼핑몰로 이동합니다.<br />
        쿠팡·네이버쇼핑은 검색 결과 페이지로 연결됩니다.
      </p>
    </div>
  );
};

export default PurchaseLinks;
