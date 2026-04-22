import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBack } from '@/hooks/use-back';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import PurchaseLinks from '@/components/PurchaseLinks';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, Star, FlaskConical, ShieldCheck, AlertTriangle,
  Heart, MessageSquare, Send, Trash2, MapPin, Search, Package,
  ChevronDown, ChevronUp, GitCompare, Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ── 안전도 설정 ── */
const SAFETY_CONFIG = {
  safe:    { label: '유익', tab: 'safe',    cls: 'border-beneficial/20 bg-beneficial/8 text-beneficial' },
  caution: { label: '주의', tab: 'caution', cls: 'border-caution/20 bg-caution/8 text-caution' },
  danger:  { label: '위험', tab: 'danger',  cls: 'border-harmful/20 bg-harmful/8 text-harmful' },
} as const;
type Safety = keyof typeof SAFETY_CONFIG;

/* ── 올리브영 재고 ── */
const OliveyoungInventory = ({ productName }: { productName: string }) => {
  const [locationInput, setLocationInput] = useState('');
  const [searchedLocation, setSearchedLocation] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const { data, isLoading } = useQuery({
    queryKey: ['oy_inventory', productName, searchedLocation],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/oliveyoung-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ productName, locationKeyword: searchedLocation }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!searchedLocation,
  });

  const stockColor = (status: string) =>
    status === 'in_stock' ? 'text-beneficial bg-beneficial/10'
    : status === 'limited' ? 'text-caution bg-caution/10'
    : 'text-muted-foreground bg-muted';

  const stockLabel = (status: string, qty: number) =>
    status === 'in_stock' ? `재고 ${qty}개`
    : status === 'limited' ? '픽업 가능'
    : '재고 미확인';

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex w-full items-center gap-3 p-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
          <MapPin className="h-4 w-4 text-brand-700" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">근처 올리브영 재고</p>
          <p className="text-xs text-muted-foreground">지역명 입력 후 조회</p>
        </div>
        {isOpen
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="flex gap-2">
            <input
              className="flex-1 h-11 rounded-lg border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="예: 강남, 홍대, 명동"
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearchedLocation(locationInput.trim()); setIsOpen(true); } }}
            />
            <Button
              size="sm"
              onClick={() => { setSearchedLocation(locationInput.trim()); setIsOpen(true); }}
              disabled={isLoading || !locationInput.trim()}
              className="shrink-0 gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              조회
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-6">
              <div className="h-4 w-4 animate-spin rounded-full border border-brand-700 border-t-transparent" />
              <span className="text-sm text-muted-foreground">{searchedLocation} 재고 조회 중</span>
            </div>
          )}

          {!isLoading && data?.error && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">{data.error}</p>
            </div>
          )}

          {!isLoading && data && !data.error && (
            <>
              {data.topProduct && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2">
                  <Package className="h-4 w-4 shrink-0 text-brand-700" />
                  <p className="text-xs text-brand-800 line-clamp-1">{data.topProduct.goodsName}</p>
                  {data.topProduct.priceToPay > 0 && (
                    <span className="ml-auto shrink-0 font-numeric text-xs font-semibold text-brand-700">
                      {data.topProduct.priceToPay.toLocaleString()}원
                    </span>
                  )}
                </div>
              )}

              {data.stores.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  {searchedLocation} 근처 매장을 찾지 못했습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{searchedLocation} 근처 매장</p>
                  {data.stores.map((s: {
                    storeName: string; address: string; stockStatus: string; remainQuantity: number;
                  }, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{s.storeName}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.address}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', stockColor(s.stockStatus))}>
                        {stockLabel(s.stockStatus, s.remainQuantity)}
                      </span>
                    </div>
                  ))}
                  <p className="text-right text-xs text-muted-foreground">
                    방문 전 올리브영 앱에서 재확인을 권장합니다
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ── 별점 ── */
const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} className="relative h-8 w-8" onMouseLeave={() => setHovered(0)}>
          <span className="absolute left-0 top-0 h-full w-1/2" onMouseEnter={() => setHovered(star - 0.5)} onClick={() => onChange(star - 0.5)} />
          <span className="absolute right-0 top-0 h-full w-1/2" onMouseEnter={() => setHovered(star)} onClick={() => onChange(star)} />
          <Star className={cn('h-8 w-8 transition-colors', display >= star ? 'fill-caution text-caution' : 'text-muted-foreground/30')} />
        </button>
      ))}
    </div>
  );
};

/* ── 매치율 카운트업 훅 ── */
function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const steps = 45;
    const duration = 1100;
    let current = 0;
    timerRef.current = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        setValue(target);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setValue(Math.round(current));
      }
    }, duration / steps);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [target, enabled]);

  return value;
}

/* ── 메인 컴포넌트 ── */
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useBack('/explore');
  const { profile } = useUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | Safety>('all');

  const getCompareIds = (): string[] => {
    try { return JSON.parse(localStorage.getItem('compare_ids') ?? '[]'); } catch { return []; }
  };
  const [inCompare, setInCompare] = useState(() => id ? getCompareIds().includes(id) : false);

  const toggleCompare = () => {
    const current = getCompareIds();
    if (inCompare) {
      localStorage.setItem('compare_ids', JSON.stringify(current.filter(c => c !== id)));
      setInCompare(false);
      toast({ title: '비교 목록에서 제거했습니다.' });
    } else {
      if (current.length >= 2) {
        toast({ title: '비교는 최대 2개까지 가능해요' });
        return;
      }
      const next = [...current, id!];
      localStorage.setItem('compare_ids', JSON.stringify(next));
      setInCompare(true);
      toast({ title: next.length === 2 ? '비교 준비 완료' : '비교 목록에 담았습니다.' });
    }
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', id],
    queryFn: async () => {
      const { data } = await supabase.from('ingredients').select('*').eq('product_id', id!).order('sort_order');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: myRatingData } = useQuery({
    queryKey: ['my_rating', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('product_ratings').select('rating').eq('product_id', id!).eq('user_id', user.id).single();
      return data;
    },
    enabled: !!id && !!user,
    onSuccess: (data) => { if (data) setMyRating(data.rating); },
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['rating_stats', id],
    queryFn: async () => {
      const { data } = await supabase.from('product_ratings').select('rating').eq('product_id', id!);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await supabase.from('product_comments').select('id, comment, created_at, user_id').eq('product_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: isWished, refetch: refetchWish } = useQuery({
    queryKey: ['wish', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('wish_list').select('id').eq('product_id', id!).eq('user_id', user.id).single();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const { data: discountAlert, refetch: refetchDiscount } = useQuery({
    queryKey: ['discount_alert', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('discount_alerts').select('id, is_active, last_price, last_discount_rate, last_checked_at').eq('product_id', id!).eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      await supabase.from('product_ratings').upsert({ user_id: user.id, product_id: id!, rating, updated_at: new Date().toISOString() }, { onConflict: 'user_id,product_id' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rating_stats', id] }); toast({ title: '평점이 저장됐습니다.' }); },
  });

  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      await supabase.from('product_comments').insert({ user_id: user.id, product_id: id!, comment });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', id] }); setCommentText(''); toast({ title: '코멘트가 등록됐습니다.' }); },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await supabase.from('product_comments').delete().eq('id', commentId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] }),
  });

  const wishMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.');
      if (isWished) {
        await supabase.from('wish_list').delete().eq('product_id', id!).eq('user_id', user.id);
      } else {
        await supabase.from('wish_list').insert({ user_id: user.id, product_id: id! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wish', id, user?.id] });
      setTimeout(() => refetchDiscount(), 500);
      queryClient.invalidateQueries({ queryKey: ['discount_alerts'] });
      toast({ title: isWished ? '찜을 취소했습니다.' : '찜 목록에 추가됐습니다.' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">제품을 찾을 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={goBack}>돌아가기</Button>
      </div>
    );
  }

  /* ── 성분 통계 ── */
  const safeCount    = ingredients.filter((i: { safety: string }) => i.safety === 'safe').length;
  const cautionCount = ingredients.filter((i: { safety: string }) => i.safety === 'caution').length;
  const dangerCount  = ingredients.filter((i: { safety: string }) => i.safety === 'danger').length;
  const total        = ingredients.length;
  const hasIngredients = total > 0;

  const allergyMatches = ingredients.filter((i: { name_kr: string; name: string }) =>
    profile.allergies?.some((a: string) => i.name_kr.includes(a) || i.name.toLowerCase().includes(a.toLowerCase()))
  );

  /* 매치율: 유익 성분 비율에서 위험·알레르기 패널티 */
  const rawScore = hasIngredients
    ? Math.max(0, Math.min(100, Math.round(
        (safeCount / total) * 100
        - dangerCount * 10
        - (allergyMatches.length > 0 ? 15 : 0)
      )))
    : 0;

  const scoreColor =
    rawScore >= 70 ? 'text-beneficial'
    : rawScore >= 40 ? 'text-caution'
    : 'text-harmful';

  const scoreBg =
    rawScore >= 70 ? 'from-beneficial/8 to-beneficial/3 border-beneficial/20'
    : rawScore >= 40 ? 'from-caution/8 to-caution/3 border-caution/20'
    : 'from-harmful/8 to-harmful/3 border-harmful/20';

  const scoreLabel =
    rawScore >= 70 ? '내 피부에 잘 맞는 제품입니다'
    : rawScore >= 40 ? '일부 성분에 주의가 필요합니다'
    : '피부 적합도가 낮습니다';

  const displayScore = useCountUp(rawScore, hasIngredients);

  /* 탭 필터 */
  const filteredIngredients = activeTab === 'all'
    ? ingredients
    : ingredients.filter((i: { safety: string }) => i.safety === activeTab);

  const TABS = [
    { key: 'all' as const,    label: '전체',  count: total },
    { key: 'safe' as const,   label: '유익',  count: safeCount },
    { key: 'caution' as const, label: '주의', count: cautionCount },
    { key: 'danger' as const, label: '위험',  count: dangerCount },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border pt-safe">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={goBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 min-w-0 text-base font-semibold text-foreground truncate">제품 상세</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => wishMutation.mutate()}
              className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-colors', isWished ? 'bg-harmful/10' : 'hover:bg-muted')}
            >
              <Heart className={cn('h-5 w-5', isWished ? 'fill-harmful text-harmful' : 'text-muted-foreground')} />
            </button>
            <button
              onClick={toggleCompare}
              className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-colors', inCompare ? 'bg-brand-50' : 'hover:bg-muted')}
            >
              <GitCompare className={cn('h-5 w-5', inCompare ? 'text-brand-700' : 'text-muted-foreground')} />
            </button>
          </div>
        </div>
      </div>

      {/* ════ 제품 + 매치율 풀-히어로 ════ */}
      <div className={cn(
        'px-4 pt-5 pb-6',
        rawScore >= 70 ? 'bg-gradient-to-b from-beneficial/12 to-background'
        : rawScore >= 40 ? 'bg-gradient-to-b from-caution/10 to-background'
        : 'bg-gradient-to-b from-harmful/10 to-background',
      )}>
        <div className="mx-auto max-w-md">

          {/* 제품 정보 */}
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-soft text-3xl select-none">
              {(product as { category?: string }).category === 'makeup' ? '💄'
               : (product as { category?: string }).category === 'suncare' ? '☀️' : '🧴'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground leading-snug">{product.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{product.brand}</p>
              {ratingStats && ratingStats.count > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-caution text-caution" />
                  <span className="font-numeric text-sm font-bold text-foreground">{ratingStats.avg.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({ratingStats.count}명)</span>
                </div>
              )}
              {(product as { is_on_sale?: boolean }).is_on_sale && (
                <div className="mt-1.5 flex items-center gap-2">
                  {(product as { original_price?: number }).original_price! > 0 && (
                    <span className="font-numeric text-xs text-muted-foreground line-through">
                      {(product as { original_price?: number }).original_price!.toLocaleString()}원
                    </span>
                  )}
                  <span className="font-numeric text-sm font-bold text-brand-700">
                    {(product as { current_price?: number }).current_price!.toLocaleString()}원
                  </span>
                  <span className="rounded-full bg-harmful px-2 py-0.5 font-numeric text-xs font-bold text-white">
                    {Math.round((product as { discount_rate?: number }).discount_rate ?? 0)}% 할인
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 매치율 빅넘버 히어로 ── */}
          {hasIngredients ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card p-6 mb-2"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">내 피부 매치율</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className={cn('font-numeric font-black leading-none animate-count', scoreColor)} style={{ fontSize: '5.5rem' }}>
                    {displayScore}
                  </span>
                  <div className="mb-3">
                    <span className={cn('font-numeric text-2xl font-bold', scoreColor)}>/100</span>
                    <p className={cn('text-xs font-semibold mt-0.5', scoreColor)}>{scoreLabel}</p>
                  </div>
                </div>

                {/* 진행 바 */}
                <div className="h-2.5 w-full rounded-full bg-black/5 overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rawScore}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={cn('h-full rounded-full', rawScore >= 70 ? 'bg-beneficial' : rawScore >= 40 ? 'bg-caution' : 'bg-harmful')}
                  />
                </div>

                {/* 성분 요약 pills */}
                <div className="flex gap-2">
                  <span className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-beneficial/30 bg-beneficial/10 py-2 text-sm font-bold text-beneficial">
                    유익 {safeCount}
                  </span>
                  <span className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-caution/30 bg-caution/10 py-2 text-sm font-bold text-caution">
                    주의 {cautionCount}
                  </span>
                  <span className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-harmful/30 bg-harmful/10 py-2 text-sm font-bold text-harmful">
                    위험 {dangerCount}
                  </span>
                </div>

                {allergyMatches.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-harmful/25 bg-harmful/8 px-3 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-harmful" />
                    <p className="text-sm text-harmful leading-relaxed font-medium">
                      알레르기 성분 감지: {allergyMatches.map((i: { name_kr: string }) => i.name_kr).join(', ')}
                    </p>
                  </div>
                )}
              </motion.div>

          </> /* hasIngredients end */
          ) : (
            /* ── 분석 미완료 인라인 ── */
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700">
                  <FlaskConical className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-900">전성분 분석 전</p>
                  <p className="text-xs text-brand-700/70">홈에서 올리브영 URL을 입력하면 분석됩니다</p>
                </div>
                <Button size="sm" onClick={() => navigate('/')} className="shrink-0">분석하기</Button>
              </div>
            </div>
          )}

        </div>{/* mx-auto hero end */}
      </div>{/* hero-bg end */}

      {/* ════ 성분 탭 + 기타 섹션 ════ */}
      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">

        {/* ── 성분 탭 ── */}
        {hasIngredients && <div>
            <div>
              <div className="flex gap-1 rounded-xl bg-sand-100 p-1 mb-3">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-base ease-brand',
                      activeTab === tab.key
                        ? 'bg-white text-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={cn('ml-1 font-numeric', activeTab === tab.key ? 'text-brand-700' : 'text-muted-foreground/60')}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {filteredIngredients.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">해당 성분이 없습니다.</p>
                  ) : (
                    filteredIngredients.map((ingredient: {
                      id: string; name_kr: string; name: string; safety: string; description: string;
                    }) => {
                      const cfg = SAFETY_CONFIG[ingredient.safety as Safety] ?? SAFETY_CONFIG.caution;
                      return (
                        <div key={ingredient.id} className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{ingredient.name_kr}</p>
                              <p className="text-xs text-muted-foreground">{ingredient.name}</p>
                            </div>
                            <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', cfg.cls)}>
                              {cfg.label}
                            </span>
                          </div>
                          {ingredient.description && (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ingredient.description}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
        </div>}{/* hasIngredients tab section end */}

        {/* ── 구매처 ── */}
        <div className="rounded-xl border border-border bg-card shadow-card p-4">
          <PurchaseLinks
            productName={product.name}
            productBrand={product.brand}
            productUrl={(product as { product_url?: string }).product_url}
            currentPrice={(product as { current_price?: number }).current_price}
            originalPrice={(product as { original_price?: number }).original_price}
            discountRate={(product as { discount_rate?: number }).discount_rate}
            isOnSale={(product as { is_on_sale?: boolean }).is_on_sale}
          />
        </div>

        {/* ── 재고 확인 ── */}
        <OliveyoungInventory productName={product.name} />

        {/* ── 내 평점 ── */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">내 평점</p>
          <StarRating value={myRating} onChange={v => { setMyRating(v); ratingMutation.mutate(v); }} />
          {!user && <p className="mt-2 text-xs text-muted-foreground">로그인 후 평점을 남길 수 있어요</p>}
        </div>

        {/* ── 코멘트 ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-brand-700" />
            <h2 className="text-sm font-semibold text-foreground">
              코멘트{comments.length > 0 ? ` ${comments.length}` : ''}
            </h2>
          </div>

          {user ? (
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 h-11 rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="한 줄 코멘트"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) commentMutation.mutate(commentText.trim()); }}
                maxLength={100}
              />
              <button
                onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white disabled:opacity-40 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">로그인 후 코멘트를 남길 수 있어요</p>
          )}

          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">첫 코멘트를 남겨보세요</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c: { id: string; comment: string; created_at: string; user_id: string }) => (
                <div key={c.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm text-foreground">{c.comment}</p>
                    {user && c.user_id === user.id && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="shrink-0 text-muted-foreground hover:text-harmful transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 font-numeric text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
