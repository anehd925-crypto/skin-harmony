import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import SafetyBadge from '@/components/SafetyBadge';
import { ChevronLeft, GitCompare, Star, Heart, ShieldCheck, AlertTriangle, Minus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  avg_rating: number | null;
  rating: number | null;
  rating_count: number | null;
  wish_count: number | null;
  original_price: number | null;
  current_price: number | null;
  discount_rate: number | null;
  is_on_sale: boolean | null;
  skin_types: string[] | null;
  skin_concerns: string[] | null;
  suitable_sensitivity: string[] | null;
}

interface Ingredient {
  id: string;
  product_id: string;
  name: string;
  name_kr: string;
  safety: string;
  description: string | null;
  sort_order: number | null;
}

const GRADE_META = {
  good: { label: '안전', color: 'text-beneficial', bg: 'bg-beneficial/10', icon: <ShieldCheck className="h-4 w-4 text-beneficial" /> },
  moderate: { label: '보통', color: 'text-caution', bg: 'bg-caution/10', icon: <AlertTriangle className="h-4 w-4 text-caution" /> },
  bad: { label: '주의', color: 'text-harmful', bg: 'bg-harmful/10', icon: <AlertTriangle className="h-4 w-4 text-harmful" /> },
};

const CATEGORY_EMOJI: Record<string, string> = {
  makeup: '💄',
  suncare: '☀️',
};

const Compare = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids') ?? '';
  const ids = idsParam.split(',').filter(Boolean).slice(0, 2);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['compare_products', ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('products')
        .select('id, name, brand, category, description, avg_rating, rating, rating_count, wish_count, original_price, current_price, discount_rate, is_on_sale, skin_types, skin_concerns, suitable_sensitivity')
        .in('id', ids);
      // ids 순서 유지
      const map = Object.fromEntries((data ?? []).map(p => [p.id, p]));
      return ids.map(id => map[id]).filter(Boolean) as Product[];
    },
    enabled: ids.length > 0,
  });

  const { data: allIngredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ['compare_ingredients', ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .in('product_id', ids)
        .order('sort_order', { ascending: true });
      return (data ?? []) as Ingredient[];
    },
    enabled: ids.length > 0,
  });

  const isLoading = productsLoading || ingredientsLoading;

  const ingByProduct = (productId: string) =>
    allIngredients.filter(i => i.product_id === productId);

  // DB 값에 name_kr이 null로 저장된 레코드 방어
  const normalize = (n?: string | null) => (n ?? '').trim().toLowerCase();

  const getCommonIngredients = () => {
    if (products.length < 2) return [];
    const [a, b] = [ingByProduct(products[0].id), ingByProduct(products[1].id)];
    const bNames = new Set(b.map(i => normalize(i.name_kr)));
    return a.filter(i => {
      const key = normalize(i.name_kr);
      return key && bNames.has(key);
    });
  };

  const getOnlyInProduct = (idx: 0 | 1) => {
    if (products.length < 2) return [];
    const [a, b] = [ingByProduct(products[0].id), ingByProduct(products[1].id)];
    const other = new Set((idx === 0 ? b : a).map(i => normalize(i.name_kr)));
    return (idx === 0 ? a : b).filter(i => {
      const key = normalize(i.name_kr);
      return key && !other.has(key);
    });
  };

  const commonIngredients = getCommonIngredients();
  const onlyInA = getOnlyInProduct(0);
  const onlyInB = getOnlyInProduct(1);

  // 성분 위험도 요약
  const safetyCount = (productId: string, safety: string) =>
    ingByProduct(productId).filter(i => i.safety === safety).length;

  if (ids.length < 2) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border pt-safe px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1 min-w-0">제품 비교</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <GitCompare className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">비교할 제품 2개를 선택해주세요</p>
          <p className="mt-1 text-xs text-muted-foreground">제품 탐색 화면에서 "비교" 버튼을 눌러 담아보세요</p>
          <button type="button" onClick={() => navigate('/explore')}
            className="mt-5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            제품 탐색하기
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border pt-safe px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1 min-w-0">제품 비교</h1>
      </div>

      <div className="px-4 space-y-4 pt-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && products.length < 2 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <GitCompare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">비교할 제품을 불러오지 못했어요</p>
            <p className="mt-1 text-xs text-muted-foreground">제품이 삭제되었거나 링크가 잘못되었을 수 있어요.</p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="mt-5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              제품 다시 선택하기
            </button>
          </div>
        )}

        {!isLoading && products.length >= 2 && (
          <>
            {/* ── 제품 헤더 비교 ── */}
            <div className="grid grid-cols-2 gap-2">
              {products.map((p, idx) => (
                <button key={p.id} type="button" onClick={() => navigate(`/product/${p.id}`)}
                  className="rounded-xl border border-border bg-card p-3 text-left shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl ${idx === 0 ? 'bg-primary/10' : 'bg-secondary'}`}>
                      {CATEGORY_EMOJI[p.category] ?? '🧴'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </div>
                  </div>
                  {/* 가격 */}
                  {(p.current_price ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.is_on_sale && (p.original_price ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground line-through">{p.original_price!.toLocaleString()}원</span>
                      )}
                      <span className={`text-xs font-bold ${p.is_on_sale ? 'text-harmful' : 'text-foreground'}`}>
                        {p.current_price!.toLocaleString()}원
                      </span>
                      {p.is_on_sale && (
                        <span className="rounded-full bg-harmful/10 px-1.5 py-0.5 text-xs font-bold text-harmful">
                          {Math.round(p.discount_rate ?? 0)}%↓
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* ── 수치 비교 ── */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border">
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">
                    {(products[0].avg_rating ?? products[0].rating ?? 0) > 0
                      ? (products[0].avg_rating ?? products[0].rating!).toFixed(1)
                      : '-'}
                  </p>
                  {(products[0].rating_count ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">{products[0].rating_count}명</p>
                  )}
                </div>
                <div className="px-3 py-2 text-center bg-muted/30">
                  <Star className="h-3.5 w-3.5 text-caution mx-auto mb-0.5 fill-current" />
                  <p className="text-xs text-muted-foreground">평점</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">
                    {(products[1].avg_rating ?? products[1].rating ?? 0) > 0
                      ? (products[1].avg_rating ?? products[1].rating!).toFixed(1)
                      : '-'}
                  </p>
                  {(products[1].rating_count ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">{products[1].rating_count}명</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border">
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{ingByProduct(products[0].id).length}</p>
                </div>
                <div className="px-3 py-2 text-center bg-muted/30">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">성분 수</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{ingByProduct(products[1].id).length}</p>
                </div>
              </div>
              {/* 안전도 */}
              {products.map((p, idx) => null) /* iterate below */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border">
                <div className="p-3 text-center space-y-0.5">
                  <p className="text-xs font-semibold text-beneficial">{safetyCount(products[0].id, 'safe')} 안전</p>
                  <p className="text-xs font-semibold text-caution">{safetyCount(products[0].id, 'caution')} 주의</p>
                  <p className="text-xs font-semibold text-harmful">{safetyCount(products[0].id, 'danger')} 위험</p>
                </div>
                <div className="px-3 py-2 text-center bg-muted/30">
                  <ShieldCheck className="h-3.5 w-3.5 text-beneficial mx-auto mb-0.5" />
                  <p className="text-xs text-muted-foreground">성분 안전도</p>
                </div>
                <div className="p-3 text-center space-y-0.5">
                  <p className="text-xs font-semibold text-beneficial">{safetyCount(products[1].id, 'safe')} 안전</p>
                  <p className="text-xs font-semibold text-caution">{safetyCount(products[1].id, 'caution')} 주의</p>
                  <p className="text-xs font-semibold text-harmful">{safetyCount(products[1].id, 'danger')} 위험</p>
                </div>
              </div>
              {/* 찜 수 */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{products[0].wish_count ?? 0}</p>
                </div>
                <div className="px-3 py-2 text-center bg-muted/30">
                  <Heart className="h-3.5 w-3.5 text-red-400 mx-auto mb-0.5 fill-current" />
                  <p className="text-xs text-muted-foreground">찜</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{products[1].wish_count ?? 0}</p>
                </div>
              </div>
            </div>

            {/* ── 피부타입 적합성 ── */}
            {(products[0].skin_types?.length ?? 0) > 0 || (products[1].skin_types?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-bold text-foreground">적합 피부 타입</p>
                <div className="grid grid-cols-2 gap-3">
                  {products.map(p => (
                    <div key={p.id}>
                      <p className="text-xs text-muted-foreground mb-1.5 truncate">{p.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {(p.skin_types ?? []).map(t => (
                          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}</span>
                        ))}
                        {(p.skin_types ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">정보 없음</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── 공통 성분 ── */}
            {commonIngredients.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-2 text-sm font-bold text-foreground">
                  공통 성분
                  <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {commonIngredients.length}개
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {commonIngredients.slice(0, 20).map(i => (
                    <span key={i.id}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                        i.safety === 'danger' ? 'border-harmful/30 bg-harmful/5 text-harmful' :
                        i.safety === 'caution' ? 'border-caution/30 bg-caution/5 text-caution' :
                        'border-border bg-secondary text-foreground'
                      }`}>
                      {i.name_kr}
                    </span>
                  ))}
                  {commonIngredients.length > 20 && (
                    <span className="text-xs text-muted-foreground self-center">+{commonIngredients.length - 20}개 더</span>
                  )}
                </div>
              </div>
            )}

            {/* ── 각 제품 고유 성분 ── */}
            {products.length >= 2 && (onlyInA.length > 0 || onlyInB.length > 0) && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-bold text-foreground">제품별 고유 성분</p>
                <div className="grid grid-cols-2 gap-3">
                  {([onlyInA, onlyInB] as Ingredient[][]).map((uniq, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate">
                        {products[idx]?.name}
                      </p>
                      {uniq.length === 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Minus className="h-3 w-3" />없음
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {uniq.slice(0, 15).map(i => (
                            <span key={i.id}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                                i.safety === 'danger' ? 'border-harmful/30 bg-harmful/5 text-harmful' :
                                i.safety === 'caution' ? 'border-caution/20 bg-caution/5 text-caution' :
                                'border-border bg-muted text-foreground'
                              }`}>
                              {i.name_kr}
                            </span>
                          ))}
                          {uniq.length > 15 && (
                            <span className="text-xs text-muted-foreground self-center">+{uniq.length - 15}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 주의/위험 성분 비교 ── */}
            {products.map(p => {
              const danger = ingByProduct(p.id).filter(i => i.safety === 'danger');
              const caution = ingByProduct(p.id).filter(i => i.safety === 'caution');
              if (danger.length === 0 && caution.length === 0) return null;
              return (
                <div key={p.id} className="rounded-xl border border-caution/20 bg-caution/5 p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold text-foreground">{p.name} — 주의 성분</p>
                  <div className="space-y-1.5">
                    {danger.map(i => (
                      <div key={i.id} className="flex items-center gap-2">
                        <SafetyBadge safety="danger" />
                        <span className="text-xs text-foreground">{i.name_kr}</span>
                      </div>
                    ))}
                    {caution.map(i => (
                      <div key={i.id} className="flex items-center gap-2">
                        <SafetyBadge safety="caution" />
                        <span className="text-xs text-foreground">{i.name_kr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 안내 */}
            {commonIngredients.length === 0 && onlyInA.length === 0 && onlyInB.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">두 제품의 상세 성분 데이터가 없습니다.</p>
                <p className="mt-1 text-xs text-muted-foreground">제품 상세 페이지에서 성분 데이터를 확인해보세요.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Compare;
