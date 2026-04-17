import { Tag, Ticket, ChevronRight } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * 올리브영 행사·쿠폰 안내 카드.
 *
 * 주의: 올리브영은 일반 개발자에게 공식 API를 공개하지 않으며,
 * 행사·쿠폰 페이지의 자동 스크래핑은 약관·운영 안정성 측면에서 권장되지 않습니다.
 * 따라서 1차 구현은 외부 링크(공식 페이지로 이동) 형태로 제공합니다.
 * 추후 제휴/공식 채널 확보 시 카드 내용을 동적으로 채우는 방향으로 확장 가능합니다.
 */
const ITEMS = [
  {
    key: 'event',
    Icon: Tag,
    label: '행사·기획전',
    sub: '올리브영 진행 중인 세일·기획전 보기',
    href: 'https://www.oliveyoung.co.kr/store/main/getEventList.do',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    iconColor: 'bg-rose-100 text-rose-600',
  },
  {
    key: 'coupon',
    Icon: Ticket,
    label: '쿠폰·혜택',
    sub: '오늘 받을 수 있는 할인 쿠폰',
    href: 'https://www.oliveyoung.co.kr/store/coupon/getCouponList.do',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'bg-amber-100 text-amber-700',
  },
] as const;

const OliveYoungDealsCard = () => {
  const open = (item: typeof ITEMS[number]) => {
    void track('oliveyoung_link_opened', { kind: item.key });
    window.open(item.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">올리브영 행사·쿠폰</h2>
        <span className="text-[11px] text-muted-foreground">공식 페이지로 이동</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => open(item)}
            className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${item.color}`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconColor}`}>
              <item.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-foreground">{item.label}</p>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default OliveYoungDealsCard;
