import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  FlaskConical, Trash2, ShieldCheck, AlertTriangle,
  ChevronLeft, ChevronDown, ChevronUp, GitCompare, X,
  Heart, Tag, RefreshCw, BookOpen, TrendingDown
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AnalyzedIngredient {
  name: string;
  name_en: string;
  safety: 'safe' | 'caution' | 'danger';
  description: string;
}

interface AnalysisResult {
  productName: string;
  productBrand: string;
  ingredients: AnalyzedIngredient[];
  overallGrade: 'good' | 'moderate' | 'bad';
  summary: string;
}

interface HistoryItem {
  id: string;
  product_name: string;
  product_brand: string;
  overall_grade: 'good' | 'moderate' | 'bad';
  result: AnalysisResult;
  created_at: string;
  skin_fit_score: number | null;
}

interface WishItem {
  id: string;
  product_id: string;
  created_at: string;
  products: { id: string; name: string; brand: string; category: string; avg_rating?: number; rating?: number } | null;
}

interface DiscountAlert {
  id: string;
  product_id: string;
  is_active: boolean;
  last_price: number | null;
  last_discount_rate: number | null;
  last_checked_at: string | null;
  alerted_at: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    original_price: number;
    current_price: number;
    discount_rate: number;
    is_on_sale: boolean;
  } | null;
}

const gradeColor = {
  good: 'border-success/30 bg-success/5 text-success',
  moderate: 'border-warning/30 bg-warning/5 text-warning',
  bad: 'border-danger/30 bg-danger/5 text-danger',
};
const gradeLabel = { good: '안전', moderate: '보통', bad: '주의' };
const gradeIcon = (g: string) => g === 'good'
  ? <ShieldCheck className="h-3 w-3" />
  : <AlertTriangle className="h-3 w-3" />;

type TabKey = 'analysis' | 'wish' | 'discounts' | 'report';

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('analysis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [isCheckingDiscounts, setIsCheckingDiscounts] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // 분석 기록
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['analysis_history', user?.id],
    queryFn: async () => {
      // RLS에 전적으로 의존하지 않고 클라이언트에서도 user_id를 명시한다.
      const { data } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as HistoryItem[];
    },
    enabled: !!user,
  });

  // 찜 목록
  const { data: wishes = [], isLoading: wishLoading } = useQuery({
    queryKey: ['wish_list', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('wish_list')
        .select('id, product_id, created_at, products(id, name, brand, category, avg_rating, rating)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as WishItem[];
    },
    enabled: !!user,
  });

  // 할인 알림 목록
  const { data: discountAlerts = [], isLoading: discountLoading, refetch: refetchDiscounts } = useQuery({
    queryKey: ['discount_alerts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('discount_alerts')
        .select('id, product_id, is_active, last_price, last_discount_rate, last_checked_at, alerted_at, created_at, products(id, name, brand, category, original_price, current_price, discount_rate, is_on_sale)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return (data ?? []) as DiscountAlert[];
    },
    enabled: !!user,
  });

  // 할인 새로고침
  const handleCheckDiscounts = async () => {
    if (!user) return;
    setIsCheckingDiscounts(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const result = await res.json();
      await refetchDiscounts();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (result.new_discount_count > 0) {
        toast({ title: `${result.new_discount_count}개 상품에서 새 할인이 발견됐습니다!` });
      } else {
        toast({ title: '할인 정보를 최신화했습니다.' });
      }
    } catch {
      toast({ title: '할인 확인 실패', variant: 'destructive' });
    } finally {
      setIsCheckingDiscounts(false);
    }
  };

  const deleteHistory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('analysis_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis_history'] });
      toast({ title: '삭제됐습니다.' });
    },
    onError: (err) => {
      toast({
        title: '삭제 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    },
  });

  const deleteWish = useMutation({
    mutationFn: async (productId: string) => {
      await supabase.from('wish_list').delete().eq('product_id', productId).eq('user_id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wish_list'] });
      queryClient.invalidateQueries({ queryKey: ['discount_alerts'] });
      toast({ title: '찜 목록에서 삭제했습니다.' });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('discount_alerts').update({ is_active: false }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount_alerts'] });
      toast({ title: '할인 알림을 해제했습니다.' });
    },
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 2) { toast({ title: '최대 2개까지 선택 가능합니다.' }); return prev; }
      return [...prev, id];
    });
  };

  const compareItems = history.filter(h => compareIds.includes(h.id));

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'analysis', label: '분석 기록', count: history.length },
    { key: 'wish',     label: '찜 목록',   count: wishes.length },
    { key: 'discounts', label: '할인 알림', count: discountAlerts.filter(a => a.products?.is_on_sale).length },
    { key: 'report',   label: '리포트',    count: 0 },
  ];

  // ── 리포트 통계 계산 ──
  const reportStats = useMemo(() => {
    if (history.length === 0) return null;

    const gradeCounts = { good: 0, moderate: 0, bad: 0 };
    const ingredientFreq: Record<string, { count: number; safety: string }> = {};
    const dangerIngredients: Record<string, number> = {};
    const cautionIngredients: Record<string, number> = {};

    history.forEach(h => {
      gradeCounts[h.overall_grade]++;
      (h.result?.ingredients ?? []).forEach((ing: { name: string; safety: string }) => {
        if (!ingredientFreq[ing.name]) ingredientFreq[ing.name] = { count: 0, safety: ing.safety };
        ingredientFreq[ing.name].count++;
        if (ing.safety === 'danger') dangerIngredients[ing.name] = (dangerIngredients[ing.name] ?? 0) + 1;
        if (ing.safety === 'caution') cautionIngredients[ing.name] = (cautionIngredients[ing.name] ?? 0) + 1;
      });
    });

    const topDanger = Object.entries(dangerIngredients)
      .sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCaution = Object.entries(cautionIngredients)
      .sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCommon = Object.entries(ingredientFreq)
      .sort((a, b) => b[1].count - a[1].count).slice(0, 8);

    const safeRatio = gradeCounts.good / history.length * 100;

    return { gradeCounts, topDanger, topCaution, topCommon, safeRatio, total: history.length };
  }, [history]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">분석 기록</h1>
        </div>
        {tab === 'analysis' && history.length >= 2 && (
          <button
            onClick={() => { setShowCompare(!showCompare); if (showCompare) setCompareIds([]); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
              showCompare ? 'bg-primary text-primary-foreground' : 'border border-border bg-neutral-50 text-muted-foreground'
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" />{showCompare ? '취소' : '비교'}
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border bg-background">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === t.key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-xs ${tab === t.key ? 'text-primary' : 'text-muted-foreground'}`}>
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* 비교 선택 배너 */}
      {tab === 'analysis' && showCompare && (
        <div className="mx-4 mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">
            {compareIds.length === 0 && '비교할 제품 2개를 선택하세요'}
            {compareIds.length === 1 && '1개 선택됨 · 1개 더 선택하세요'}
            {compareIds.length === 2 && '2개 선택 완료'}
          </p>
          {compareIds.length === 2 && (
            <button
              onClick={() => setShowCompare(false)}
              className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground"
            >
              비교 결과 보기
            </button>
          )}
        </div>
      )}

      {/* 비교 모달 */}
      {!showCompare && compareIds.length === 2 && compareItems.length === 2 && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto pb-24">
          <div className="bg-primary px-4 pb-4 pt-12 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-primary-foreground">성분 비교</h2>
              <button onClick={() => setCompareIds([])} className="rounded-full bg-primary-foreground/20 p-1.5">
                <X className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {compareItems.map(item => (
                <div key={item.id} className="rounded-lg bg-primary-foreground/20 p-2">
                  <p className="truncate text-xs font-bold text-primary-foreground">{item.product_name}</p>
                  <span className={`text-xs ${item.overall_grade === 'good' ? 'text-green-200' : item.overall_grade === 'bad' ? 'text-red-200' : 'text-yellow-200'}`}>
                    {gradeLabel[item.overall_grade]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 mt-4 space-y-2">
            {(() => {
              const [a, b] = compareItems;
              const aNames = new Set(a.result.ingredients?.map(i => i.name) ?? []);
              const bNames = new Set(b.result.ingredients?.map(i => i.name) ?? []);
              const common = [...aNames].filter(n => bNames.has(n));
              const commonDanger = common.filter(n => {
                const ai = a.result.ingredients?.find(i => i.name === n);
                return ai && (ai.safety === 'danger' || ai.safety === 'caution');
              });
              return commonDanger.length > 0 ? (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs font-bold text-warning">두 제품 공통 주의 성분</p>
                  <p className="mt-1 text-xs text-muted-foreground">{commonDanger.join(', ')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                  <p className="text-xs font-bold text-success">공통 주의 성분 없음</p>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              {compareItems.map(item => (
                <div key={item.id} className="space-y-1.5">
                  <p className="text-xs font-bold text-foreground truncate">{item.product_name}</p>
                  {item.result.ingredients?.map((ing, idx) => (
                    <div key={idx} className={`rounded-lg p-2 text-xs ${
                      ing.safety === 'safe' ? 'bg-success/10' :
                      ing.safety === 'danger' ? 'bg-danger/10' : 'bg-warning/10'
                    }`}>
                      <p className="font-medium text-foreground truncate">{ing.name}</p>
                      <p className={`text-xs ${ing.safety === 'safe' ? 'text-success' : ing.safety === 'danger' ? 'text-danger' : 'text-warning'}`}>
                        {ing.safety === 'safe' ? '안전' : ing.safety === 'danger' ? '위험' : '주의'}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      )}

      <div className="px-4 pt-3 space-y-2">

        {/* ─ 분석 기록 탭 ─ */}
        {tab === 'analysis' && (
          <>
            {historyLoading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}
            {!historyLoading && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">아직 분석한 제품이 없어요</p>
                <button onClick={() => navigate('/scan')} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  첫 번째 제품 분석하기
                </button>
              </div>
            )}
            {history.map(item => {
              const isExpanded = expandedId === item.id;
              const isSelected = compareIds.includes(item.id);
              const safeCount = item.result.ingredients?.filter(i => i.safety === 'safe').length ?? 0;
              const cautionCount = item.result.ingredients?.filter(i => i.safety === 'caution').length ?? 0;
              const dangerCount = item.result.ingredients?.filter(i => i.safety === 'danger').length ?? 0;

              return (
                <div key={item.id} className={`rounded-xl border bg-card shadow-card overflow-hidden transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      {showCompare && (
                        <button onClick={() => toggleCompare(item.id)}
                          className={`shrink-0 mt-0.5 h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                          {isSelected && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.product_name}</p>
                        {item.product_brand && <p className="text-xs text-muted-foreground">{item.product_brand}</p>}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${gradeColor[item.overall_grade]}`}>
                            {gradeIcon(item.overall_grade)}{gradeLabel[item.overall_grade]}
                          </span>
                          {item.skin_fit_score != null && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              item.skin_fit_score >= 80 ? 'bg-green-100 text-green-700' :
                              item.skin_fit_score >= 60 ? 'bg-primary/15 text-primary' :
                              item.skin_fit_score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              매칭 {item.skin_fit_score}점
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                        </div>
                        <div className="mt-1 flex gap-3 text-xs">
                          <span className="text-success font-medium">안전 {safeCount}</span>
                          <span className="text-warning font-medium">주의 {cautionCount}</span>
                          <span className="text-danger font-medium">위험 {dangerCount}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteHistory.mutate(item.id)} className="shrink-0 p-1.5 text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground">
                      {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" />접기</> : <><ChevronDown className="h-3.5 w-3.5" />성분 목록 보기</>}
                    </button>
                  </div>
                  {isExpanded && item.result.ingredients && (
                    <div className="border-t border-border divide-y divide-border">
                      {item.result.ingredients.map((ing, idx) => (
                        <div key={idx} className="px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-foreground">{ing.name}</p>
                              <p className="text-xs text-muted-foreground">{ing.name_en}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              ing.safety === 'safe' ? 'bg-success/10 text-success' :
                              ing.safety === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                            }`}>
                              {ing.safety === 'safe' ? '안전' : ing.safety === 'danger' ? '위험' : '주의'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{ing.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ─ 찜 목록 탭 ─ */}
        {tab === 'wish' && (
          <>
            {wishLoading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}
            {!wishLoading && wishes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Heart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">찜한 제품이 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">제품 상세 페이지에서 "써보고싶다"를 눌러보세요</p>
                <button onClick={() => navigate('/explore')} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  제품 탐색하기
                </button>
              </div>
            )}
            {wishes.map(w => {
              const p = w.products;
              if (!p) return null;
              const avgRating = p.avg_rating ?? p.rating ?? 0;
              return (
                <div key={w.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <button onClick={() => navigate(`/product/${p.id}`)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl">
                      {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                      {avgRating > 0 && (
                        <p className="mt-0.5 text-xs text-warning">★ {avgRating.toFixed(1)}</p>
                      )}
                    </div>
                  </button>
                  <button onClick={() => deleteWish.mutate(w.product_id)} className="shrink-0 p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* ─ 할인 알림 탭 ─ */}
        {tab === 'discounts' && (
          <>
            {/* 상단: 새로고침 버튼 */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">찜한 상품의 올리브영 할인 현황</p>
              <button
                type="button"
                onClick={handleCheckDiscounts}
                disabled={isCheckingDiscounts || !user}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isCheckingDiscounts ? 'animate-spin' : ''}`} />
                {isCheckingDiscounts ? '확인 중...' : '지금 확인'}
              </button>
            </div>

            {discountLoading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}

            {!discountLoading && discountAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">할인 알림 대상 상품이 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">제품을 찜하면 자동으로 할인 알림이 등록돼요</p>
                <button onClick={() => navigate('/explore')} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  제품 탐색하기
                </button>
              </div>
            )}

            {/* 할인 중인 상품 */}
            {discountAlerts.filter(a => a.products?.is_on_sale).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-4 w-4 text-danger" />
                  <p className="text-sm font-bold text-foreground">지금 할인 중</p>
                </div>
                {discountAlerts.filter(a => a.products?.is_on_sale).map(alert => {
                  const p = alert.products;
                  if (!p) return null;
                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => navigate(`/product/${p.id}`)}
                      className="mb-2 flex w-full items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-2xl">
                        {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {p.original_price > 0 && (
                            <span className="text-xs text-muted-foreground line-through">{p.original_price.toLocaleString()}원</span>
                          )}
                          {p.current_price > 0 && (
                            <span className="text-sm font-bold text-danger">{p.current_price.toLocaleString()}원</span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white">
                        {Math.round(p.discount_rate)}% 할인
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 할인 중 아닌 찜 상품 */}
            {discountAlerts.filter(a => !a.products?.is_on_sale).length > 0 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">할인 대기 중</p>
                {discountAlerts.filter(a => !a.products?.is_on_sale).map(alert => {
                  const p = alert.products;
                  if (!p) return null;
                  return (
                    <div key={alert.id} className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <button type="button" onClick={() => navigate(`/product/${p.id}`)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl">
                          {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                          {p.current_price > 0 && (
                            <p className="text-xs text-muted-foreground">{p.current_price.toLocaleString()}원</p>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAlert.mutate(alert.id)}
                        className="shrink-0 p-1.5 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {discountAlerts.length > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {discountAlerts[0]?.last_checked_at
                  ? `마지막 확인: ${new Date(discountAlerts[0].last_checked_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                  : '"지금 확인" 버튼으로 최신 할인 정보를 가져오세요'}
              </p>
            )}
          </>
        )}

        {/* ─ 리포트 탭 ─ */}
        {tab === 'report' && (
          <>
            {historyLoading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}

            {!historyLoading && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">분석 기록이 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">제품을 분석하면 리포트가 자동으로 생성됩니다</p>
                <button onClick={() => navigate('/scan')} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  지금 분석하기
                </button>
              </div>
            )}

            {reportStats && (
              <div className="space-y-4">
                {/* 요약 카드 */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="mb-3 text-sm font-bold text-foreground">전체 분석 요약</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-success/8 py-3">
                      <p className="text-xl font-bold text-success">{reportStats.gradeCounts.good}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">안전 제품</p>
                    </div>
                    <div className="rounded-xl bg-warning/8 py-3">
                      <p className="text-xl font-bold text-warning">{reportStats.gradeCounts.moderate}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">보통 제품</p>
                    </div>
                    <div className="rounded-xl bg-danger/8 py-3">
                      <p className="text-xl font-bold text-danger">{reportStats.gradeCounts.bad}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">주의 제품</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-muted/40 p-2.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">안전 비율</span>
                      <span className="font-semibold text-foreground">{Math.round(reportStats.safeRatio)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${reportStats.safeRatio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 자주 발견된 위험 성분 */}
                {reportStats.topDanger.length > 0 && (
                  <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 shadow-card">
                    <p className="mb-2 text-sm font-bold text-foreground">자주 발견된 위험 성분</p>
                    <p className="mb-3 text-xs text-muted-foreground">분석한 제품에서 반복적으로 발견된 주의 필요 성분입니다</p>
                    <div className="space-y-2">
                      {reportStats.topDanger.map(([name, cnt]) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{name}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-danger/20 w-20 overflow-hidden">
                              <div className="h-full rounded-full bg-danger" style={{ width: `${(cnt / reportStats.total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-danger w-8 text-right">{cnt}회</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 자주 발견된 주의 성분 */}
                {reportStats.topCaution.length > 0 && (
                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 shadow-card">
                    <p className="mb-2 text-sm font-bold text-foreground">자주 발견된 주의 성분</p>
                    <div className="space-y-2">
                      {reportStats.topCaution.map(([name, cnt]) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{name}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-warning/20 w-20 overflow-hidden">
                              <div className="h-full rounded-full bg-warning" style={{ width: `${(cnt / reportStats.total) * 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-warning w-8 text-right">{cnt}회</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 자주 등장한 성분 */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="mb-2 text-sm font-bold text-foreground">자주 등장한 성분 TOP 8</p>
                  <div className="flex flex-wrap gap-1.5">
                    {reportStats.topCommon.map(([name, info]) => (
                      <span key={name} className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                        info.safety === 'danger' ? 'border-danger/30 bg-danger/5 text-danger' :
                        info.safety === 'caution' ? 'border-warning/20 bg-warning/5 text-warning' :
                        'border-border bg-secondary text-foreground'
                      }`}>
                        {name} <span className="opacity-60">·{info.count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  총 {reportStats.total}개 제품 분석 기준
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default History;
