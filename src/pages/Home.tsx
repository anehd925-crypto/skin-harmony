import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import NotificationPermission from '@/components/NotificationPermission';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Star, Heart, ChevronRight, FlaskConical, TrendingDown, Camera, Layers, BookMarked, ShieldAlert, Package } from 'lucide-react';
import RoutineSafetyCard from '@/components/RoutineSafetyCard';
import WeatherRoutineCard from '@/components/WeatherRoutineCard';

const Home = () => {
  const { profile } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 현재 시간 기반 아침/저녁 자동 선택 (6~13시 → 아침, 나머지 → 저녁)
  const currentPeriod: 'morning' | 'evening' = new Date().getHours() < 14 ? 'morning' : 'evening';

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
  });

  // 최근 분석 기록 피드 — 내 분석 기록만 표시 (user_id 필터)
  const { data: recentAnalysis = [], isLoading: analysisLoading } = useQuery({
    queryKey: ['recent_analysis', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('analysis_history')
        .select('id, product_name, product_brand, overall_grade, created_at, source')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 내 찜 목록 (홈에 간략히)
  const { data: myWishes = [] } = useQuery({
    queryKey: ['my_wishes_home', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('wish_list')
        .select('product_id, products(id, name, brand, category)')
        .eq('user_id', user.id)
        .limit(4);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 할인 중인 찜 상품 (홈 배너용)
  const { data: saleWishes = [] } = useQuery({
    queryKey: ['sale_wishes_home', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('discount_alerts')
        .select('product_id, last_discount_rate, products(id, name, brand, category, original_price, current_price, discount_rate, is_on_sale)')
        .eq('user_id', user.id)
        .eq('is_active', true);
      return (data ?? []).filter((d: { products: { is_on_sale?: boolean } | null }) => d.products?.is_on_sale);
    },
    enabled: !!user,
  });

  // 맞춤 추천 점수 계산 + 추천 이유 태그
  const topRecommended = useMemo(() => {
    const CONCERN_LABELS: Record<string, string> = {
      '민감': '민감 피부에 적합',
      '건조': '건조함을 집중 케어',
      '여드름': '트러블 진정에 효과적',
      '모공': '모공 케어',
      '탄력': '탄력 개선',
      '색소침착': '피부 톤 개선',
      '홍조': '홍조 완화',
      '주름': '주름 케어',
      '각질 제거': '각질 케어',
      '민감 피부': '민감 피부 전용',
    };
    return products.map(p => {
      let score = 0;
      const reasons: string[] = [];
      const pt = (p as { skin_types?: string[] }).skin_types ?? [];
      const pc = (p as { skin_concerns?: string[] }).skin_concerns ?? [];
      const pSens = (p as { suitable_sensitivity?: string[] }).suitable_sensitivity ?? [];
      const pAge = (p as { suitable_age_groups?: string[] }).suitable_age_groups ?? [];
      const pAvoid = (p as { avoid_skin_conditions?: string[] }).avoid_skin_conditions ?? [];

      if (profile.skinType && pt.includes(profile.skinType)) {
        score += 3;
        reasons.push(`${profile.skinType} 피부 맞춤`);
      }
      profile.concernPriority.forEach((c, idx) => {
        if (pc.includes(c)) {
          score += Math.max(3, 5 - idx);
          const label = CONCERN_LABELS[c] ?? `${c} 케어`;
          if (idx === 0) reasons.push(`1순위 고민 — ${label}`);
          else reasons.push(label);
        }
      });
      profile.skinConcerns
        .filter(c => !profile.concernPriority.includes(c))
        .forEach(c => {
          if (pc.includes(c)) {
            score += 2;
            reasons.push(CONCERN_LABELS[c] ?? `${c} 케어`);
          }
        });
      if (pSens.length === 0 || pSens.includes(profile.skinSensitivity)) {
        score += 2;
        if (profile.skinSensitivity === 'very_sensitive' || profile.skinSensitivity === 'sensitive') {
          reasons.push('민감 피부도 사용 가능');
        }
      }
      if (profile.ageGroup && (pAge.length === 0 || pAge.includes(profile.ageGroup))) score += 1;
      if (pAvoid.includes(profile.skinCondition)) score -= 2;
      const rating = (p as { avg_rating?: number }).avg_rating ?? p.rating ?? 0;
      score += rating * 0.1;
      if (rating >= 4.5) reasons.push('사용자 평점 높음');

      // 이유 태그가 없을 때 제품 특징으로 폴백
      if (reasons.length === 0) {
        if (pc.length > 0) reasons.push(CONCERN_LABELS[pc[0]] ?? `${pc[0]} 케어`);
        if (pt.length > 0 && pt.length <= 2) reasons.push(`${pt[0]} 피부 추천`);
      }

      // 할인 중인 경우 이유 추가
      if ((p as { is_on_sale?: boolean }).is_on_sale) {
        const dr = Math.round((p as { discount_rate?: number }).discount_rate ?? 0);
        if (dr >= 5) reasons.unshift(`지금 ${dr}% 할인 중`);
      }

      // AI 자동 태깅된 제품 가산점 (성분 기반 신뢰도 높음)
      if ((p as { ai_tagged_at?: string }).ai_tagged_at) {
        score += 0.5;
        if (reasons.length === 0) reasons.push('성분 기반 AI 분석 완료');
      }

      return { ...p, _score: score, _reasons: reasons.slice(0, 2) };
    })
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);
  }, [products, profile]);

  const gradeColor = {
    good: 'text-success bg-success/10',
    moderate: 'text-warning bg-warning/10',
    bad: 'text-danger bg-danger/10',
  };
  const gradeLabel = { good: '안전', moderate: '보통', bad: '주의' };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* 헤더 */}
      <div className="gradient-brand px-5 pb-6 pt-12">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
          <span className="text-lg font-bold text-primary-foreground">BeautyLens</span>
        </div>
        <p className="mt-2 text-sm text-primary-foreground/80">
          {profile.skinType
            ? <><span className="font-semibold text-primary-foreground">{profile.skinType}</span> 피부 맞춤 추천</>
            : '내 피부에 맞는 제품을 찾아보세요'}
        </p>
        {profile.skinConcerns.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.skinConcerns.slice(0, 4).map(c => (
              <span key={c} className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* 푸시 알림 권한 요청 배너 */}
      <NotificationPermission />

      {/* 오늘의 루틴 안전도 카드 */}
      <div className="pt-3 px-4">
        <RoutineSafetyCard />
      </div>

      {/* 날씨 기반 루틴 추천 카드 */}
      <div className="pt-2">
        <WeatherRoutineCard period={currentPeriod} />
      </div>

      <div className="px-5 space-y-6 pt-2">

        {/* 빠른 액션 — 1단(주요2개) + 2단(나머지 2열 그리드) */}
        <div className="space-y-2 -mt-3">
          {/* 1단: 가장 많이 쓰는 2개 — 풀 와이드 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/scan')}
              className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 shadow-card transition-all active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">성분 스캔</p>
                <p className="text-[10px] text-muted-foreground leading-tight">URL·카메라·직접입력</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/skin-solution')}
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-card transition-all active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <span className="text-lg">💊</span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">트러블 솔루션</p>
                <p className="text-[10px] text-muted-foreground leading-tight">약국 의약품 추천</p>
              </div>
            </button>
          </div>

          {/* 2단: 나머지 기능들 */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Layers className="h-5 w-5" />, label: '루틴', sub: '궁합분석', path: '/routine', bg: 'bg-purple-100', text: 'text-purple-600' },
              { icon: <BookMarked className="h-5 w-5" />, label: '피부일기', sub: 'AI기록', path: '/diary', bg: 'bg-green-100', text: 'text-green-600' },
              { icon: <Package className="h-5 w-5" />, label: '보관함', sub: '날씨추천', path: '/cabinet', bg: 'bg-amber-100', text: 'text-amber-600' },
              { icon: <ShieldAlert className="h-5 w-5" />, label: '블랙리스트', sub: '성분경보', path: '/blacklist', bg: 'bg-red-100', text: 'text-red-500' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 shadow-card transition-all active:scale-95"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} ${item.text}`}>
                  {item.icon}
                </div>
                <p className="text-[11px] font-bold text-foreground leading-tight text-center">{item.label}</p>
                <p className="text-[9px] text-muted-foreground leading-none">{item.sub}</p>
              </button>
            ))}
          </div>

          {/* 타임라인 — 와이드 */}
          <button
            onClick={() => navigate('/timeline')}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card transition-all active:scale-95"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <TrendingDown className="h-5 w-5 rotate-180" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">피부 변화 타임라인</p>
              <p className="text-[10px] text-muted-foreground leading-tight">루틴 변경 + 피부 점수 추세</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* 맞춤 추천 제품 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">
              {profile.skinType ? `${profile.skinType} 피부 추천` : '인기 제품'}
            </h2>
            <button onClick={() => navigate('/explore')} className="flex items-center gap-0.5 text-xs text-primary font-medium">
              전체 보기<ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {topRecommended.map((p, idx) => {
              const avgRating = (p as { avg_rating?: number }).avg_rating ?? p.rating ?? 0;
              const reasons = (p as { _reasons?: string[] })._reasons ?? [];
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-card transition-shadow hover:shadow-soft"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl">
                    {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {idx === 0 && p._score > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">최적</span>
                      )}
                      <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-warning" />
                      <span className="text-xs text-warning">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</span>
                    </div>
                  </div>
                  {reasons.length > 0 && (
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {reasons.map(r => (
                        <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary whitespace-nowrap">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 할인 중인 찜 상품 배너 */}
        {user && saleWishes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-danger" />
                <h2 className="text-base font-bold text-foreground">찜한 상품 할인 중</h2>
                <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">{saleWishes.length}</span>
              </div>
              <button onClick={() => navigate('/history')} className="flex items-center gap-0.5 text-xs text-primary font-medium">
                전체 보기<ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {(saleWishes as Array<{
                product_id: string;
                products: { id: string; name: string; brand: string; category: string; original_price: number; current_price: number; discount_rate: number; is_on_sale: boolean } | null;
              }>).slice(0, 3).map(w => {
                const p = w.products;
                if (!p) return null;
                return (
                  <button
                    key={w.product_id}
                    type="button"
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 p-3 text-left"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-2xl">
                      {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {p.original_price > 0 && (
                          <span className="text-xs text-muted-foreground line-through">{p.original_price.toLocaleString()}원</span>
                        )}
                        {p.current_price > 0 && (
                          <span className="text-sm font-bold text-danger">{p.current_price.toLocaleString()}원</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white">
                      {Math.round(p.discount_rate)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 찜 목록 미리보기 */}
        {user && myWishes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-red-400 fill-current" />
                <h2 className="text-base font-bold text-foreground">써보고 싶은 제품</h2>
              </div>
              <button onClick={() => navigate('/history')} className="flex items-center gap-0.5 text-xs text-primary font-medium">
                전체 보기<ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {myWishes.map((w: { product_id: string; products: { id: string; name: string; brand: string; category: string } | null }) => {
                const p = w.products;
                if (!p) return null;
                return (
                  <button
                    key={w.product_id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left"
                  >
                    <span className="text-xl">
                      {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 최근 분석 피드 */}
        {user && (analysisLoading || recentAnalysis.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">최근 분석</h2>
              </div>
              {!analysisLoading && (
                <button onClick={() => navigate('/history')} className="flex items-center gap-0.5 text-xs text-primary font-medium">
                  전체 보기<ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {analysisLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="space-y-2">
              {recentAnalysis.map((a: { id: string; product_name: string; product_brand: string; overall_grade: string; created_at: string; source: string }) => {
                const grade = a.overall_grade as 'good' | 'moderate' | 'bad';
                const d = new Date(a.created_at);
                const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate('/history')}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-card"
                  >
                    <FlaskConical className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{a.product_name}</p>
                      <p className="text-xs text-muted-foreground">{a.product_brand || a.source}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${gradeColor[grade] ?? gradeColor.moderate}`}>
                        {gradeLabel[grade] ?? '보통'}
                      </span>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
