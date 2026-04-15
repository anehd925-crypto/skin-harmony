import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import { Search, SlidersHorizontal, Star, Heart, GitCompare, X, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  { key: 'all',      label: '전체' },
  { key: 'skincare', label: '스킨케어' },
  { key: 'suncare',  label: '선케어' },
  { key: 'makeup',   label: '색조' },
] as const;

const SORTS = [
  { key: 'match',  label: '맞춤순' },
  { key: 'rating', label: '평점순' },
  { key: 'wish',   label: '인기순' },
] as const;

type SortKey = typeof SORTS[number]['key'];

const PAGE_SIZE = 12;

const Explore = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('match');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showTrends, setShowTrends] = useState(false);

  const { data: trendIngredients = [] } = useQuery({
    queryKey: ['ingredient_trends'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_ingredient_trends', { p_limit: 10, p_days: 30 });
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: gradeDistribution = [] } = useQuery({
    queryKey: ['grade_distribution'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_grade_distribution', { p_days: 30 });
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products_explore'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 2) return prev; // 최대 2개
      return [...prev, id];
    });
  };

  // 필터/정렬/검색이 바뀌면 목록 처음으로
  const resetVisible = () => setVisibleCount(PAGE_SIZE);

  const scored = useMemo(() => {
    return products.map(p => {
      let matchScore = 0;
      const pt = (p as { skin_types?: string[] }).skin_types ?? [];
      const pc = (p as { skin_concerns?: string[] }).skin_concerns ?? [];
      const pSens = (p as { suitable_sensitivity?: string[] }).suitable_sensitivity ?? [];
      const pAge = (p as { suitable_age_groups?: string[] }).suitable_age_groups ?? [];
      const pAvoid = (p as { avoid_skin_conditions?: string[] }).avoid_skin_conditions ?? [];

      if (profile.skinType && pt.includes(profile.skinType)) matchScore += 3;
      profile.concernPriority.forEach((c, idx) => {
        if (pc.includes(c)) matchScore += Math.max(3, 5 - idx);
      });
      profile.skinConcerns
        .filter(c => !profile.concernPriority.includes(c))
        .forEach(c => { if (pc.includes(c)) matchScore += 2; });
      if (pSens.length === 0 || pSens.includes(profile.skinSensitivity)) matchScore += 2;
      if (profile.ageGroup && (pAge.length === 0 || pAge.includes(profile.ageGroup))) matchScore += 1;
      if (pAvoid.includes(profile.skinCondition)) matchScore -= 2;

      return {
        ...p,
        _match: matchScore,
        _avgRating: (p as { avg_rating?: number }).avg_rating ?? p.rating ?? 0,
        _wishCount: (p as { wish_count?: number }).wish_count ?? 0,
      };
    });
  }, [products, profile]);

  const filtered = useMemo(() => {
    let list = scored;

    if (category !== 'all') list = list.filter(p => p.category === category);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p as { description?: string }).description?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sort === 'match')  return b._match - a._match;
      if (sort === 'rating') return b._avgRating - a._avgRating;
      if (sort === 'wish')   return b._wishCount - a._wishCount;
      return 0;
    });
  }, [scored, category, query, sort]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* 헤더 */}
      <div className="gradient-brand px-5 pb-5 pt-12">
        <h1 className="text-lg font-bold text-primary-foreground">탐색</h1>
        <p className="mt-0.5 text-sm text-primary-foreground/80">제품명, 브랜드, 성분으로 검색하세요</p>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제품명, 브랜드 검색"
            value={query}
            onChange={e => { setQuery(e.target.value); resetVisible(); }}
            className="rounded-xl bg-background pl-10 border-0 shadow-card"
          />
        </div>
      </div>

      <div className="px-5 pt-3 space-y-3">
        {/* 트렌드 대시보드 (접힌 형태) */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setShowTrends(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">최근 30일 성분 트렌드</p>
            </div>
            {showTrends ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showTrends && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
              {/* 등급 분포 */}
              {gradeDistribution.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">분석 등급 분포</p>
                  <div className="flex gap-2">
                    {gradeDistribution.map((g: { grade: string; count: number; percentage: number }) => (
                      <div key={g.grade} className={`flex-1 rounded-xl p-3 text-center ${
                        g.grade === 'good' ? 'bg-success/10' : g.grade === 'moderate' ? 'bg-yellow-50' : 'bg-destructive/10'
                      }`}>
                        <p className={`text-base font-bold ${
                          g.grade === 'good' ? 'text-success' : g.grade === 'moderate' ? 'text-yellow-600' : 'text-destructive'
                        }`}>{g.percentage}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.grade === 'good' ? '안전' : g.grade === 'moderate' ? '보통' : '주의'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{g.count}건</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 인기 성분 TOP 10 */}
              {trendIngredients.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">많이 분석된 성분 TOP 10</p>
                  <div className="space-y-2">
                    {(trendIngredients as Array<{ ingredient_name: string; total_count: number; safe_count: number; caution_count: number; danger_count: number }>).map((ing, idx) => {
                      const safeRatio = ing.total_count > 0 ? (ing.safe_count / ing.total_count) : 0;
                      const dangerRatio = ing.total_count > 0 ? (ing.danger_count / ing.total_count) : 0;
                      return (
                        <div key={ing.ingredient_name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-xs font-medium text-foreground truncate">{ing.ingredient_name}</p>
                              <p className="text-[10px] text-muted-foreground ml-2 shrink-0">{ing.total_count}회</p>
                            </div>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${dangerRatio > 0.3 ? 'bg-destructive' : safeRatio > 0.7 ? 'bg-success' : 'bg-yellow-400'}`}
                                style={{ width: `${Math.min(100, (ing.total_count / (trendIngredients[0] as { total_count: number }).total_count) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {trendIngredients.length === 0 && gradeDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">아직 분석 데이터가 충분하지 않아요</p>
              )}
            </div>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => { setCategory(cat.key); resetVisible(); }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                category === cat.key
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 정렬 + 결과 수 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">제품 {filtered.length}개</span>
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => { setSort(s.key); resetVisible(); }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    sort === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 제품 목록 */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.slice(0, visibleCount).map((p, idx) => {
                const desc = (p as { description?: string }).description ?? '';
                const avgRating = p._avgRating;
                const matchScore = p._match;
                const isTopMatch = idx === 0 && sort === 'match' && matchScore > 0;
                const inCompare = compareIds.includes(p.id);
                const compareDisabled = !inCompare && compareIds.length >= 2;

                return (
                  <div key={p.id} className="relative">
                    {isTopMatch && (
                      <span className="absolute -top-1.5 left-3 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        최적 매칭
                      </span>
                    )}
                    <div className={`flex items-center gap-2 rounded-xl border bg-card transition-shadow hover:shadow-md ${
                      inCompare ? 'border-primary' : 'border-border'
                    }`}>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${p.id}`)}
                        className="flex flex-1 items-center gap-3 p-3 text-left min-w-0"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-xl">
                          {p.category === 'makeup' ? '💄' : p.category === 'suncare' ? '☀️' : '🧴'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                          {desc && <p className="mt-0.5 truncate text-xs text-muted-foreground">{desc}</p>}
                          <div className="mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-0.5 text-xs text-warning">
                              <Star className="h-3 w-3 fill-current" />
                              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
                            </span>
                            {p._wishCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Heart className="h-3 w-3" />{p._wishCount}
                              </span>
                            )}
                            {sort === 'match' && matchScore > 0 && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                매칭 {matchScore}점
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      {/* 비교 버튼 */}
                      <button
                        type="button"
                        onClick={() => toggleCompare(p.id)}
                        disabled={compareDisabled}
                        className={`mr-3 shrink-0 rounded-lg p-1.5 transition-colors ${
                          inCompare
                            ? 'bg-primary text-primary-foreground'
                            : compareDisabled
                            ? 'text-muted-foreground/30'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        title={inCompare ? '비교 해제' : '비교에 추가'}
                      >
                        <GitCompare className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 더보기 버튼 */}
            {visibleCount < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="mt-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:border-primary"
              >
                더보기 ({visibleCount}/{filtered.length})
              </button>
            )}

            {/* 모두 표시됐을 때 */}
            {visibleCount >= filtered.length && filtered.length > PAGE_SIZE && (
              <p className="mt-2 py-3 text-center text-xs text-muted-foreground">
                전체 {filtered.length}개 제품을 모두 표시했습니다
              </p>
            )}
          </>
        )}
      </div>

      {/* 비교 플로팅 바 */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-between gap-3 mx-4 rounded-2xl bg-primary px-4 py-3 shadow-xl">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompare className="h-4 w-4 text-primary-foreground shrink-0" />
            <span className="text-sm font-medium text-primary-foreground truncate">
              {compareIds.length === 1 ? '1개 선택 · 1개 더 선택하세요' : '비교할 준비 완료'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {compareIds.length === 2 && (
              <button
                type="button"
                onClick={() => navigate(`/compare?ids=${compareIds.join(',')}`)}
                className="rounded-xl bg-primary-foreground px-4 py-1.5 text-sm font-bold text-primary"
              >
                비교하기
              </button>
            )}
            <button type="button" onClick={() => setCompareIds([])} className="p-1">
              <X className="h-4 w-4 text-primary-foreground/70" />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Explore;
