import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, Sun, Cloud, Moon, Plus, Trash2, Zap,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Loader2, X, Sparkles, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface HistoryItem {
  id: string;
  product_name: string;
  product_brand: string;
  ingredients_text: string;
  created_at: string;
}

interface RoutineProduct {
  id: string;
  product_name: string;
  product_brand: string;
  ingredients_snapshot: string;
  analysis_history_id: string | null;
}

interface Routine {
  id: string;
  name: RoutineTab;
  products: RoutineProduct[];
}

type RoutineTab = 'morning' | 'afternoon' | 'evening';

interface ConflictItem {
  product_a: string;
  product_b: string;
  ingredient_a: string;
  ingredient_b: string;
  severity?: 'high' | 'medium' | 'low';
  reason: string;
  recommendation?: string;
}

interface SynergyItem {
  product_a: string;
  product_b: string;
  ingredient_a: string;
  ingredient_b: string;
  benefit: string;
}

interface ProductRecommendation {
  productType: string;
  reason: string;
  suggestedIngredients: string[];
  avoidIngredients: string[];
  targetConflict?: string;
}

interface ConflictResult {
  compatibilityScore: number;
  scoreLabel: '완벽' | '좋음' | '보통' | '주의' | '위험';
  conflicts: ConflictItem[];
  cautions: ConflictItem[];
  synergies: SynergyItem[];
  overallSafety: 'safe' | 'caution' | 'warning';
  summary: string;
  applicationOrder?: string[];
  productRecommendations?: ProductRecommendation[];
}

const TABS: { key: RoutineTab; label: string; icon: React.ReactNode }[] = [
  { key: 'morning',   label: '아침',  icon: <Sun   className="h-3.5 w-3.5" /> },
  { key: 'afternoon', label: '낮',    icon: <Cloud className="h-3.5 w-3.5" /> },
  { key: 'evening',   label: '저녁',  icon: <Moon  className="h-3.5 w-3.5" /> },
];

const SCORE_COLORS = {
  완벽: { ring: '#22c55e', text: 'text-green-500',   bg: 'bg-green-50 border-green-200',   label: '완벽한 조합이에요' },
  좋음: { ring: '#84cc16', text: 'text-lime-500',    bg: 'bg-lime-50 border-lime-200',     label: '잘 어울리는 조합이에요' },
  보통: { ring: '#eab308', text: 'text-yellow-500',  bg: 'bg-yellow-50 border-yellow-200', label: '일부 주의가 필요해요' },
  주의: { ring: '#f97316', text: 'text-orange-500',  bg: 'bg-orange-50 border-orange-200', label: '조합을 조정해보세요' },
  위험: { ring: '#ef4444', text: 'text-red-500',     bg: 'bg-red-50 border-red-200',       label: '성분 충돌이 심해요' },
} as const;

const severityBadge = {
  high:   'bg-destructive/10 text-destructive',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-muted text-muted-foreground',
};

// 원형 게이지를 SVG로 그리는 컴포넌트
const ScoreGauge = ({ score, label }: { score: number; label: keyof typeof SCORE_COLORS }) => {
  const cfg = SCORE_COLORS[label] ?? SCORE_COLORS['보통'];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={cfg.ring}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-2xl font-black ${cfg.text}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <div className={`rounded-full border px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
        {label} — {cfg.label}
      </div>
    </div>
  );
};

const Routine = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUser();
  const { toast } = useToast();

  const [routines, setRoutines] = useState<Record<RoutineTab, Routine | null>>({
    morning: null, afternoon: null, evening: null,
  });
  const [activeTab, setActiveTab] = useState<RoutineTab>('morning');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  const currentRoutine = routines[activeTab];

  const loadRoutines = useCallback(async () => {
    if (!user) return;
    setLoadingRoutines(true);

    const { data: rows } = await supabase
      .from('routines')
      .select('id, name')
      .eq('user_id', user.id);

    const result: Record<RoutineTab, Routine | null> = { morning: null, afternoon: null, evening: null };

    for (const r of rows || []) {
      const { data: prods } = await supabase
        .from('routine_products')
        .select('id, product_name, product_brand, ingredients_snapshot, analysis_history_id')
        .eq('routine_id', r.id)
        .order('added_at', { ascending: true });

      result[r.name as RoutineTab] = {
        id: r.id,
        name: r.name as RoutineTab,
        products: prods || [],
      };
    }

    setRoutines(result);
    setLoadingRoutines(false);
  }, [user]);

  useEffect(() => { loadRoutines(); }, [loadRoutines]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('analysis_history')
      .select('id, product_name, product_brand, ingredients_text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setHistory(data || []);
  };

  const handleAddProduct = async (item: HistoryItem) => {
    if (!user) return;
    let routineId = currentRoutine?.id;

    if (!routineId) {
      const { data: newRoutine, error } = await supabase
        .from('routines')
        .insert({ user_id: user.id, name: activeTab })
        .select('id')
        .single();
      if (error || !newRoutine) {
        toast({ title: '오류', description: '루틴 생성에 실패했습니다.', variant: 'destructive' });
        return;
      }
      routineId = newRoutine.id;
    }

    const { error } = await supabase.from('routine_products').insert({
      routine_id: routineId,
      analysis_history_id: item.id,
      product_name: item.product_name || '이름 없음',
      product_brand: item.product_brand || '',
      ingredients_snapshot: item.ingredients_text.slice(0, 500),
    });

    if (error) {
      toast({ title: '오류', description: '제품 추가에 실패했습니다.', variant: 'destructive' });
      return;
    }

    setShowAddModal(false);
    setConflictResult(null);
    await loadRoutines();
  };

  const handleRemoveProduct = async (productId: string) => {
    const { error } = await supabase.from('routine_products').delete().eq('id', productId);
    if (error) {
      toast({ title: '오류', description: '제품 삭제에 실패했습니다.', variant: 'destructive' });
      return;
    }
    setConflictResult(null);
    await loadRoutines();
  };

  const handleCheckConflicts = async () => {
    const products = currentRoutine?.products;
    if (!products || products.length < 2) {
      toast({ title: '안내', description: '궁합 분석을 위해 최소 2개 이상의 제품을 추가해주세요.' });
      return;
    }

    setCheckingConflicts(true);
    setConflictResult(null);

    try {
      const userProfilePayload = profile.skinType ? {
        skinType: profile.skinType,
        skinConcerns: profile.skinConcerns,
        specialCondition: profile.specialCondition,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('check-routine-conflicts', {
        body: {
          products: products.map(p => ({
            name: p.product_name,
            brand: p.product_brand,
            ingredients: p.ingredients_snapshot,
          })),
          userProfile: userProfilePayload,
        },
      });

      if (error) throw error;
      const result = data as ConflictResult;
      setConflictResult(result);
      setShowConflicts(false);
      setShowRecommendations(false);
    } catch {
      toast({ title: '오류', description: '궁합 분석에 실패했습니다. 잠시 후 다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setCheckingConflicts(false);
    }
  };

  const tabChange = (tab: RoutineTab) => {
    setActiveTab(tab);
    setConflictResult(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => navigate('/history')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold">루틴 체커</h1>
          <p className="text-xs text-muted-foreground">제품 궁합을 AI로 점수 매겨드려요</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* 아침/낮/저녁 탭 */}
        <div className="flex gap-1.5 rounded-xl bg-muted p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => tabChange(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                activeTab === t.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}{t.label}
              {routines[t.key]?.products?.length ? (
                <span className={`ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {routines[t.key]!.products.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 제품 목록 */}
        {loadingRoutines ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {!currentRoutine || currentRoutine.products.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">아직 추가된 제품이 없어요</p>
                <p className="mt-1 text-xs text-muted-foreground">분석 기록에서 제품을 추가해보세요</p>
              </div>
            ) : (
              currentRoutine.products.map((prod, idx) => (
                <div key={prod.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{prod.product_name}</p>
                    {prod.product_brand && (
                      <p className="text-xs text-muted-foreground truncate">{prod.product_brand}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveProduct(prod.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => { loadHistory(); setShowAddModal(true); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />분석 기록에서 추가
            </button>
          </div>
        )}

        {/* 궁합 분석 버튼 */}
        {(currentRoutine?.products?.length ?? 0) >= 2 && (
          <Button
            onClick={handleCheckConflicts}
            disabled={checkingConflicts}
            className="w-full rounded-xl gradient-primary text-primary-foreground h-12"
          >
            {checkingConflicts ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI 분석 중...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />궁합 AI 분석 시작</>
            )}
          </Button>
        )}

        {/* ── 분석 결과 ── */}
        {conflictResult && (
          <div className="space-y-4">
            {/* 점수 게이지 */}
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {TABS.find(t => t.key === activeTab)?.label} 루틴 궁합 점수
              </p>
              <ScoreGauge
                score={conflictResult.compatibilityScore ?? 0}
                label={conflictResult.scoreLabel ?? '보통'}
              />
              <p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed max-w-[280px]">
                {conflictResult.summary}
              </p>
            </div>

            {/* 통계 요약 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
                <p className="text-lg font-black text-destructive">{conflictResult.conflicts?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">충돌</p>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
                <p className="text-lg font-black text-yellow-600">{conflictResult.cautions?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">주의</p>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-center">
                <p className="text-lg font-black text-success">{conflictResult.synergies?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">시너지</p>
              </div>
            </div>

            {/* 사용 순서 */}
            {conflictResult.applicationOrder && conflictResult.applicationOrder.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground mb-3">권장 사용 순서</p>
                <div className="relative pl-4">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                  {conflictResult.applicationOrder.map((step, i) => (
                    <div key={i} className="relative flex items-start gap-2 pb-3 last:pb-0">
                      <div className="absolute -left-4 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </div>
                      <p className="text-xs text-muted-foreground pl-2">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 상세 분석 토글 */}
            {(conflictResult.conflicts?.length > 0 || conflictResult.cautions?.length > 0 || conflictResult.synergies?.length > 0) && (
              <>
                <button
                  onClick={() => setShowConflicts(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-sm font-medium"
                >
                  <span>성분 상세 분석</span>
                  {showConflicts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {showConflicts && (
                  <div className="space-y-3">
                    {/* 충돌 */}
                    {conflictResult.conflicts?.length > 0 && (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <p className="text-xs font-bold text-destructive">성분 충돌 ({conflictResult.conflicts.length})</p>
                        </div>
                        {conflictResult.conflicts.map((c, i) => (
                          <div key={i} className="border-t border-destructive/10 pt-3 first:border-0 first:pt-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${severityBadge[c.severity || 'medium']}`}>
                                {c.severity === 'high' ? '높음' : c.severity === 'medium' ? '중간' : '낮음'}
                              </span>
                              <p className="text-xs font-semibold text-foreground">{c.ingredient_a} + {c.ingredient_b}</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
                            {c.recommendation && <p className="mt-1.5 text-xs text-primary font-medium">{c.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 주의 */}
                    {conflictResult.cautions?.length > 0 && (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 space-y-3">
                        <p className="text-xs font-bold text-yellow-700">주의 사항 ({conflictResult.cautions.length})</p>
                        {conflictResult.cautions.map((c, i) => (
                          <div key={i} className="border-t border-yellow-200 pt-3 first:border-0 first:pt-0">
                            <p className="text-xs font-semibold text-foreground mb-1">{c.ingredient_a} + {c.ingredient_b}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
                            {c.recommendation && <p className="mt-1 text-xs text-yellow-700">{c.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 시너지 */}
                    {conflictResult.synergies?.length > 0 && (
                      <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <p className="text-xs font-bold text-success">시너지 효과 ({conflictResult.synergies.length})</p>
                        </div>
                        {conflictResult.synergies.map((s, i) => (
                          <div key={i} className="border-t border-success/10 pt-3 first:border-0 first:pt-0">
                            <p className="text-xs font-semibold text-foreground mb-1">{s.ingredient_a} + {s.ingredient_b}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{s.benefit}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── AI 대안 제품 추천 (점수 < 70) ── */}
            {conflictResult.productRecommendations && conflictResult.productRecommendations.length > 0 && (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-primary">AI 대안 제품 추천</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    현재 루틴의 충돌을 줄일 수 있는 대체 제품 유형을 제안해드려요.
                    이 제품 유형으로 교체하면 궁합 점수를 높일 수 있어요.
                  </p>
                </div>

                <button
                  onClick={() => setShowRecommendations(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl border border-primary/30 bg-card p-3.5 text-sm font-medium text-primary"
                >
                  <span>대안 제품 {conflictResult.productRecommendations.length}가지 보기</span>
                  {showRecommendations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showRecommendations && (
                  <div className="space-y-3">
                    {conflictResult.productRecommendations.map((rec, i) => (
                      <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">{rec.productType}</p>
                            {rec.targetConflict && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">→ {rec.targetConflict} 해결</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-7">{rec.reason}</p>

                        {rec.suggestedIngredients?.length > 0 && (
                          <div className="pl-7">
                            <p className="text-[10px] font-semibold text-success mb-1">추천 성분</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.suggestedIngredients.map(ing => (
                                <span key={ing} className="text-[10px] rounded-full bg-success/10 text-success px-2 py-0.5 border border-success/20">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.avoidIngredients?.length > 0 && (
                          <div className="pl-7">
                            <p className="text-[10px] font-semibold text-destructive mb-1">피해야 할 성분</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.avoidIngredients.map(ing => (
                                <span key={ing} className="text-[10px] rounded-full bg-destructive/10 text-destructive px-2 py-0.5 border border-destructive/20">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => navigate('/explore')}
                          className="ml-7 mt-1 text-xs text-primary underline underline-offset-2 font-medium"
                        >
                          탐색에서 비슷한 제품 찾기 →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 제품 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-h-[80vh] rounded-t-2xl bg-background border-t border-border overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
              <p className="text-sm font-semibold">
                {TABS.find(t => t.key === activeTab)?.label} 루틴에 제품 추가
              </p>
              <button onClick={() => setShowAddModal(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">분석 기록이 없습니다.</p>
                  <button
                    onClick={() => { setShowAddModal(false); navigate('/scan'); }}
                    className="mt-2 text-xs text-primary underline"
                  >
                    지금 분석하러 가기
                  </button>
                </div>
              ) : (
                history.map(item => {
                  const alreadyAdded = currentRoutine?.products.some(p => p.analysis_history_id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => !alreadyAdded && handleAddProduct(item)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors ${
                        alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.product_name || '이름 없는 제품'}
                        </p>
                        {item.product_brand && (
                          <p className="text-xs text-muted-foreground truncate">{item.product_brand}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      {alreadyAdded && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">추가됨</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Routine;
