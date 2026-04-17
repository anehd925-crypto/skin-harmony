import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import SafetyBadge from '@/components/SafetyBadge';
import BottomNav from '@/components/BottomNav';
import PurchaseLinks from '@/components/PurchaseLinks';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, Star, FlaskConical, ShieldCheck, AlertTriangle,
  Heart, MessageSquare, FlaskConical as AnalyzeIcon, Send, Trash2,
  MapPin, Search, Package, ChevronDown, ChevronUp, GitCompare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 올리브영 재고 확인 컴포넌트
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

  const handleSearch = () => {
    const loc = locationInput.trim();
    if (!loc) return;
    setSearchedLocation(loc);
    setIsOpen(true);
  };

  const stockColor = (status: string) => {
    if (status === 'in_stock') return 'text-success bg-success/10';
    if (status === 'limited') return 'text-warning bg-warning/10';
    return 'text-muted-foreground bg-muted';
  };
  const stockLabel = (status: string, qty: number) => {
    if (status === 'in_stock') return `재고 ${qty}개`;
    if (status === 'limited') return '픽업 가능';
    return '재고 미확인';
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex w-full items-center gap-3 p-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
          <MapPin className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground">올리브영 근처 재고 확인</p>
          <p className="text-xs text-muted-foreground">지역명 입력 → 근처 매장 재고 조회</p>
        </div>
        {isOpen
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* 펼쳐지는 내용 */}
      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* 지역 검색 입력 */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="예: 강남, 홍대, 명동"
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Search className="h-3.5 w-3.5" />
              조회
            </button>
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="flex items-center justify-center py-6 gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border border-green-600 border-t-transparent" />
              <span className="text-sm text-muted-foreground">{searchedLocation} 근처 재고 조회 중...</span>
            </div>
          )}

          {/* 오류 */}
          {!isLoading && data?.error && (
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">{data.error}</p>
            </div>
          )}

          {/* 결과 */}
          {!isLoading && data && !data.error && (
            <>
              {/* 검색된 올리브영 상품명 */}
              {data.topProduct && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
                  <Package className="h-4 w-4 shrink-0 text-green-600" />
                  <p className="text-xs text-green-800 line-clamp-1">{data.topProduct.goodsName}</p>
                  {data.topProduct.priceToPay > 0 && (
                    <span className="ml-auto shrink-0 text-xs font-semibold text-green-700">
                      {data.topProduct.priceToPay.toLocaleString()}원
                    </span>
                  )}
                </div>
              )}

              {/* 매장 재고 목록 */}
              {data.stores.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  {searchedLocation} 근처에서 매장을 찾지 못했습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{searchedLocation} 근처 올리브영 매장</p>
                  {data.stores.map((s: {
                    storeName: string;
                    address: string;
                    stockStatus: string;
                    remainQuantity: number;
                  }, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{s.storeName}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.address}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${stockColor(s.stockStatus)}`}>
                        {stockLabel(s.stockStatus, s.remainQuantity)}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-right">
                    실시간 재고는 방문 전 올리브영 앱에서 재확인을 권장합니다
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

// 별점 입력 컴포넌트 (0.5단위)
const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          className="relative h-8 w-8"
          onMouseLeave={() => setHovered(0)}
        >
          {/* 왼쪽 반(0.5점) */}
          <span
            className="absolute left-0 top-0 h-full w-1/2"
            onMouseEnter={() => setHovered(star - 0.5)}
            onClick={() => onChange(star - 0.5)}
          />
          {/* 오른쪽 반(1점) */}
          <span
            className="absolute right-0 top-0 h-full w-1/2"
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
          />
          <Star
            className={`h-8 w-8 transition-colors ${
              display >= star
                ? 'fill-warning text-warning'
                : display >= star - 0.5
                ? 'text-warning'
                : 'text-muted-foreground/30'
            }`}
            style={display >= star - 0.5 && display < star ? {
              background: 'linear-gradient(90deg, hsl(var(--warning)) 50%, transparent 50%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            } : undefined}
          />
        </button>
      ))}
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');

  // 비교 담기 상태 (localStorage)
  const getCompareIds = (): string[] => {
    try { return JSON.parse(localStorage.getItem('compare_ids') ?? '[]'); } catch { return []; }
  };
  const [inCompare, setInCompare] = useState(() => id ? getCompareIds().includes(id) : false);

  const toggleCompare = () => {
    const current = getCompareIds();
    if (inCompare) {
      const next = current.filter(cid => cid !== id);
      localStorage.setItem('compare_ids', JSON.stringify(next));
      setInCompare(false);
      toast({ title: '비교 목록에서 제거했습니다.' });
    } else {
      if (current.length >= 2) {
        toast({ title: '비교는 최대 2개까지 가능해요', description: '기존 항목을 먼저 제거해주세요.' });
        return;
      }
      const next = [...current, id!];
      localStorage.setItem('compare_ids', JSON.stringify(next));
      setInCompare(true);
      if (next.length === 2) {
        toast({
          title: '비교 준비 완료',
          description: '탐색 페이지에서 비교하기 버튼을 눌러주세요.',
        });
      } else {
        toast({ title: '비교 목록에 담았습니다.', description: '탐색 페이지에서 다른 제품도 선택해보세요.' });
      }
    }
  };

  // 제품 정보
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  // DB 성분 목록
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', id],
    queryFn: async () => {
      const { data } = await supabase.from('ingredients').select('*').eq('product_id', id!).order('sort_order');
      return data ?? [];
    },
    enabled: !!id,
  });

  // 내 기존 평점
  const { data: myRatingData } = useQuery({
    queryKey: ['my_rating', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('product_ratings')
        .select('rating')
        .eq('product_id', id!)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!id && !!user,
    onSuccess: (data) => { if (data) setMyRating(data.rating); },
  });

  // 평균 평점 + 평가 수
  const { data: ratingStats } = useQuery({
    queryKey: ['rating_stats', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_ratings')
        .select('rating')
        .eq('product_id', id!);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!id,
  });

  // 코멘트 목록
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_comments')
        .select('id, comment, created_at, user_id')
        .eq('product_id', id!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  // 찜 여부
  const { data: isWished, refetch: refetchWish } = useQuery({
    queryKey: ['wish', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('wish_list')
        .select('id')
        .eq('product_id', id!)
        .eq('user_id', user.id)
        .single();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  // 할인 알림 여부
  const { data: discountAlert, refetch: refetchDiscount } = useQuery({
    queryKey: ['discount_alert', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('discount_alerts')
        .select('id, is_active, last_price, last_discount_rate, last_checked_at')
        .eq('product_id', id!)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // 평점 저장
  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      await supabase.from('product_ratings').upsert({
        user_id: user.id,
        product_id: id!,
        rating,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating_stats', id] });
      toast({ title: '평점이 저장됐습니다.' });
    },
  });

  // 코멘트 저장
  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      await supabase.from('product_comments').insert({
        user_id: user.id,
        product_id: id!,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
      toast({ title: '코멘트가 등록됐습니다.' });
    },
  });

  // 코멘트 삭제
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await supabase.from('product_comments').delete().eq('id', commentId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] }),
  });

  // 찜 토글
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
      setTimeout(() => refetchDiscount(), 500); // 트리거 실행 후 할인알림 상태 갱신
      queryClient.invalidateQueries({ queryKey: ['discount_alerts'] });
      if (!isWished) {
        toast({
          title: '찜 목록에 추가됐습니다.',
          description: '할인알림이 자동으로 등록됐어요. 할인 시 기록 탭에서 확인할 수 있어요.',
        });
      } else {
        toast({ title: '찜을 취소했습니다.' });
      }
    },
  });

  const handleRating = (v: number) => {
    setMyRating(v);
    ratingMutation.mutate(v);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">제품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const safeCount = ingredients.filter(i => i.safety === 'safe').length;
  const cautionCount = ingredients.filter(i => i.safety === 'caution').length;
  const dangerCount = ingredients.filter(i => i.safety === 'danger').length;
  const hasIngredients = ingredients.length > 0;

  const allergyMatches = ingredients.filter(i =>
    profile.allergies.some(a => i.name_kr.includes(a) || i.name.toLowerCase().includes(a.toLowerCase()))
  );

  const overallGrade = dangerCount === 0 && cautionCount <= 1 ? 'good' : dangerCount >= 2 ? 'bad' : 'moderate';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1 min-w-0">제품 상세</h1>
      </div>

      {/* 제품 정보 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">
              {product.category === 'makeup' ? '💄' : product.category === 'suncare' ? '☀️' : '🧴'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight">{product.name}</h2>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-sm text-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {ratingStats?.avg ?? 0 > 0 ? ratingStats?.avg.toFixed(1) : '-'}
                </span>
                {ratingStats?.count ? (
                  <span className="text-xs text-muted-foreground">({ratingStats.count}명)</span>
                ) : null}
              </div>
              {(product as { is_on_sale?: boolean }).is_on_sale && (
                <div className="mt-1.5 flex items-center gap-2">
                  {(product as { original_price?: number }).original_price! > 0 && (
                    <span className="text-xs text-muted-foreground line-through">
                      {(product as { original_price?: number }).original_price!.toLocaleString()}원
                    </span>
                  )}
                  <span className="text-sm font-bold text-primary">
                    {(product as { current_price?: number }).current_price!.toLocaleString()}원
                  </span>
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {Math.round((product as { discount_rate?: number }).discount_rate ?? 0)}% 할인
                  </span>
                </div>
              )}
              {!(product as { is_on_sale?: boolean }).is_on_sale && (product as { current_price?: number }).current_price! > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {(product as { current_price?: number }).current_price!.toLocaleString()}원
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => wishMutation.mutate()}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors ${
                isWished ? 'bg-primary/10' : 'bg-secondary'
              }`}
            >
              <Heart className={`h-5 w-5 ${isWished ? 'fill-red-400 text-red-400' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{isWished ? '찜됨' : '써보고싶다'}</span>
            </button>
            {isWished && discountAlert?.is_active && (
              <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-medium text-yellow-600">
                할인알림 ON
              </span>
            )}
            <button
              type="button"
              onClick={toggleCompare}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors ${
                inCompare ? 'bg-primary/10' : 'bg-secondary'
              }`}
            >
              <GitCompare className={`h-5 w-5 ${inCompare ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{inCompare ? '비교중' : '비교'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 내 평점 */}
        <div className="-mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-bold text-foreground">내 평점</p>
          <StarRating value={myRating} onChange={handleRating} />
          {myRating > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {myRatingData ? '평점을 수정했습니다' : `${myRating}점 저장됨`}
            </p>
          )}
          {!user && <p className="mt-1 text-xs text-muted-foreground">로그인 후 평점을 남길 수 있어요</p>}
        </div>

        {/* 성분 분석 결과 or 분석하기 버튼 */}
        {hasIngredients ? (
          <>
            <div className={`rounded-xl border p-4 shadow-card ${
              overallGrade === 'good' ? 'border-success/30 bg-success/5' :
              overallGrade === 'bad' ? 'border-danger/30 bg-danger/5' :
              'border-warning/30 bg-warning/5'
            }`}>
              <div className="flex items-center gap-2">
                {overallGrade === 'good'
                  ? <ShieldCheck className="h-5 w-5 text-success" />
                  : <AlertTriangle className={`h-5 w-5 ${overallGrade === 'bad' ? 'text-danger' : 'text-warning'}`} />}
                <span className="text-sm font-bold text-foreground">
                  {overallGrade === 'good' ? '내 피부에 좋은 제품이에요!' :
                   overallGrade === 'bad' ? '주의가 필요한 제품이에요' :
                   '일부 성분에 주의가 필요해요'}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-success font-medium">안전 {safeCount}</span>
                <span className="text-warning font-medium">주의 {cautionCount}</span>
                <span className="text-danger font-medium">위험 {dangerCount}</span>
              </div>
            </div>

            {allergyMatches.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs font-semibold text-danger">⚠️ 알레르기 성분 감지</p>
                <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name_kr).join(', ')}</p>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-base font-bold text-foreground">전성분 분석</h2>
              <div className="space-y-2">
                {ingredients.map(ingredient => (
                  <div key={ingredient.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{ingredient.name_kr}</p>
                        <p className="text-xs text-muted-foreground">{ingredient.name}</p>
                      </div>
                      <SafetyBadge safety={ingredient.safety as 'safe' | 'caution' | 'danger'} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ingredient.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <AnalyzeIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">전성분 분석 미완료</p>
                <p className="text-xs text-muted-foreground">이 제품의 전성분 분석 결과가 없어요</p>
              </div>
              <Button
                size="sm"
                className="shrink-0 rounded-full text-xs"
                onClick={() => navigate('/analyze')}
              >
                분석하기
              </Button>
            </div>
          </div>
        )}

        {/* 구매처 비교 */}
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

        {/* 올리브영 재고 확인 */}
        <OliveyoungInventory productName={product.name} />

        {/* 코멘트 섹션 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-bold text-foreground">코멘트 {comments.length > 0 ? `(${comments.length})` : ''}</h2>
          </div>

          {/* 코멘트 입력 */}
          {user ? (
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="한 줄 코멘트를 남겨보세요"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
                maxLength={100}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">로그인 후 코멘트를 남길 수 있어요</p>
          )}

          {/* 코멘트 목록 */}
          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">첫 코멘트를 남겨보세요</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground flex-1">{c.comment}</p>
                    {user && c.user_id === user.id && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="shrink-0 text-muted-foreground hover:text-danger transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
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
