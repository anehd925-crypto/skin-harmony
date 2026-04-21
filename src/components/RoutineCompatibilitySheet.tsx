/**
 * RoutineCompatibilitySheet
 * - 보관함(my_cabinet) 제품을 입력으로 성분 충돌·시너지 분석을 수행하는 시트.
 * - my_cabinet.analysis_history_id → analysis_history.ingredients_text 조인으로 성분을 가져온다.
 * - 시간(아침/저녁) 탭으로 분석 대상을 좁힐 수 있다.
 *
 * 옵션 B(데이터 일원화) 적용에 따라 별도 /routine 페이지를 대체한다.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Sun, Moon, Loader2, Zap, Sparkles, AlertTriangle, CheckCircle, Lightbulb, Info, Package,
} from 'lucide-react';

// ─── 타입 (Routine.tsx의 ConflictResult와 호환) ─────────────────────────────────
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

interface CabinetItemLite {
  id: string;
  product_name: string;
  product_brand: string | null;
  category: string;
  step_order: number;
  is_morning: boolean;
  is_evening: boolean;
  analysis_history_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 보관함 제품 (MyCabinet에서 그대로 전달) */
  items: CabinetItemLite[];
  /** 시트 열릴 때 기본 탭 */
  defaultTab?: TimeTab;
}

type TimeTab = 'morning' | 'evening';

const SCORE_COLORS = {
  완벽: { ring: '#22c55e', text: 'text-green-500',  bg: 'bg-green-50 border-green-200',  label: '완벽한 조합이에요' },
  좋음: { ring: '#84cc16', text: 'text-lime-500',   bg: 'bg-lime-50 border-lime-200',    label: '잘 어울리는 조합이에요' },
  보통: { ring: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', label: '일부 주의가 필요해요' },
  주의: { ring: '#f97316', text: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', label: '조합을 조정해보세요' },
  위험: { ring: '#ef4444', text: 'text-red-500',    bg: 'bg-red-50 border-red-200',      label: '성분 충돌이 심해요' },
} as const;

const ScoreGauge = ({ score, label }: { score: number; label: keyof typeof SCORE_COLORS }) => {
  const cfg = SCORE_COLORS[label] ?? SCORE_COLORS['보통'];
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
          <circle cx="46" cy="46" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="9" />
          <circle
            cx="46" cy="46" r={radius}
            fill="none" stroke={cfg.ring} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-xl font-black ${cfg.text}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <div className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
        {label} · {cfg.label}
      </div>
    </div>
  );
};

const RoutineCompatibilitySheet = ({ open, onOpenChange, items, defaultTab = 'morning' }: Props) => {
  const { user } = useAuth();
  const { profile } = useUser();
  const { toast } = useToast();

  const [tab, setTab] = useState<TimeTab>(defaultTab);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ConflictResult | null>(null);
  /** 분석 대상에 ingredients가 누락된 제품 (사용자 안내용) */
  const [missingNames, setMissingNames] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setResult(null);
      setMissingNames([]);
    }
  }, [open, defaultTab]);

  const targets = useMemo(
    () => items
      .filter(i => (tab === 'morning' ? i.is_morning : i.is_evening))
      .sort((a, b) => a.step_order - b.step_order),
    [items, tab],
  );

  const handleAnalyze = async () => {
    if (!user) return;
    if (targets.length < 2) {
      toast({ title: '분석에 필요한 제품 부족', description: '아침/저녁 루틴에 2개 이상의 제품이 필요해요.' });
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setMissingNames([]);

    try {
      // 1) analysis_history_id가 있는 제품의 성분 텍스트 일괄 조회
      const ids = targets.map(t => t.analysis_history_id).filter((v): v is string => !!v);
      let ingMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: histRows } = await supabase
          .from('analysis_history')
          .select('id, ingredients_text')
          .in('id', ids);
        ingMap = new Map(((histRows ?? []) as { id: string; ingredients_text: string | null }[])
          .map(r => [r.id, r.ingredients_text ?? '']));
      }

      // 2) 분석 페이로드 구성
      const payload = targets.map(t => {
        const text = t.analysis_history_id ? (ingMap.get(t.analysis_history_id) ?? '') : '';
        return {
          name: t.product_name,
          brand: t.product_brand ?? '',
          ingredients: text.slice(0, 500),
        };
      });

      const missing = payload.filter(p => !p.ingredients.trim()).map(p => p.name);
      setMissingNames(missing);

      const validPayload = payload.filter(p => p.ingredients.trim());
      if (validPayload.length < 2) {
        toast({
          title: '성분 정보가 부족해요',
          description: '분석된 성분이 있는 제품이 2개 이상이어야 합니다. 스캔 탭에서 먼저 분석해주세요.',
          variant: 'destructive',
        });
        return;
      }

      // 3) Edge Function 호출
      const userProfilePayload = profile.skinType ? {
        skinType: profile.skinType,
        skinConcerns: profile.skinConcerns,
        specialCondition: profile.specialCondition,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('check-routine-conflicts', {
        body: { products: validPayload, userProfile: userProfilePayload },
      });

      if (error) throw error;
      const r = data as ConflictResult;
      setResult(r);

      // 4) 홈 카드용 캐시 동기화 (Routine.tsx와 동일 스키마)
      const conflictCount = r.conflicts?.length ?? 0;
      const synergyCount = r.synergies?.length ?? 0;
      const topConflict = r.conflicts?.[0]
        ? `${r.conflicts[0].ingredient_a} + ${r.conflicts[0].ingredient_b}`
        : null;
      const score = Math.max(0, 100 - conflictCount * 15 + synergyCount * 5);
      await supabase
        .from('routine_conflict_cache' as never)
        .upsert({
          user_id: user.id,
          score,
          conflict_count: conflictCount,
          synergy_count: synergyCount,
          top_conflict: topConflict,
          created_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id' });
    } catch (err) {
      toast({
        title: '궁합 분석 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-left flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            루틴 성분 궁합 체크
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            보관함의 아침/저녁 루틴 제품들이 함께 쓰일 때 충돌·시너지가 있는지 AI가 분석합니다.
          </p>
        </SheetHeader>

        {/* 시간 탭 */}
        <div className="px-4 pt-3">
          <div className="flex gap-1.5 rounded-xl bg-muted p-1">
            {(['morning', 'evening'] as TimeTab[]).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => { setTab(k); setResult(null); setMissingNames([]); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  tab === k ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
                }`}
              >
                {k === 'morning' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {k === 'morning' ? '아침' : '저녁'} 루틴
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {items.filter(i => k === 'morning' ? i.is_morning : i.is_evening).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 본문 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {/* 분석 대상 미리보기 */}
          <div className="rounded-2xl border border-border bg-white p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-violet-600" />
              <p className="text-xs font-bold text-foreground">
                분석 대상 ({targets.length}개)
              </p>
            </div>
            {targets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tab === 'morning' ? '아침' : '저녁'} 루틴에 등록된 제품이 없어요. 보관함에서 사용 시간을 설정해주세요.
              </p>
            ) : (
              <ul className="space-y-1">
                {targets.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-3 shrink-0 font-bold text-violet-500">{i + 1}</span>
                    <span className="truncate text-foreground font-medium">{t.product_name}</span>
                    {!t.analysis_history_id && (
                      <span className="ml-auto shrink-0 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        성분 없음
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {missingNames.length > 0 && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 leading-relaxed flex gap-1.5">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  성분 정보가 없는 제품은 분석에서 제외됐어요: <b>{missingNames.join(', ')}</b>.
                  스캔 탭에서 해당 제품을 한 번 분석하면 다음부터 포함됩니다.
                </span>
              </div>
            )}
          </div>

          {/* 분석 결과 */}
          {result && (
            <div className="space-y-3">
              {/* 종합 점수 */}
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <ScoreGauge score={result.compatibilityScore} label={result.scoreLabel} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">종합 평가</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{result.summary}</p>
                </div>
              </div>

              {/* 적용 순서 */}
              {result.applicationOrder && result.applicationOrder.length > 0 && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs font-bold text-violet-800 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> 권장 적용 순서
                  </p>
                  <ol className="text-[11px] text-violet-900 space-y-0.5">
                    {result.applicationOrder.map((p, i) => (
                      <li key={i}><b>{i + 1}.</b> {p}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 충돌 */}
              {result.conflicts.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> 성분 충돌 ({result.conflicts.length}건)
                  </p>
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="rounded-xl bg-white/70 px-3 py-2 text-[11px]">
                      <p className="font-semibold text-red-700">
                        {c.product_a} ↔ {c.product_b}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {c.ingredient_a} + {c.ingredient_b}
                      </p>
                      <p className="text-foreground mt-1 leading-relaxed">{c.reason}</p>
                      {c.recommendation && (
                        <p className="text-violet-700 mt-1">💡 {c.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 주의 */}
              {result.cautions.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> 함께 쓸 때 주의 ({result.cautions.length}건)
                  </p>
                  {result.cautions.map((c, i) => (
                    <div key={i} className="rounded-xl bg-white/70 px-3 py-2 text-[11px]">
                      <p className="font-semibold text-amber-800">
                        {c.product_a} ↔ {c.product_b}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {c.ingredient_a} + {c.ingredient_b}
                      </p>
                      <p className="text-foreground mt-1 leading-relaxed">{c.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 시너지 */}
              {result.synergies.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-green-800 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> 좋은 시너지 ({result.synergies.length}건)
                  </p>
                  {result.synergies.map((s, i) => (
                    <div key={i} className="rounded-xl bg-white/70 px-3 py-2 text-[11px]">
                      <p className="font-semibold text-green-800">
                        {s.product_a} + {s.product_b}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {s.ingredient_a} + {s.ingredient_b}
                      </p>
                      <p className="text-foreground mt-1 leading-relaxed">{s.benefit}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 추천 제품 보강 */}
              {result.productRecommendations && result.productRecommendations.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> 추천 보강 제품
                  </p>
                  {result.productRecommendations.map((p, i) => (
                    <div key={i} className="rounded-xl border border-border bg-neutral-50 px-3 py-2 text-[11px] space-y-1">
                      <p className="font-bold text-foreground">{p.productType}</p>
                      <p className="text-muted-foreground leading-relaxed">{p.reason}</p>
                      {p.suggestedIngredients?.length > 0 && (
                        <p className="text-green-700">
                          포함: {p.suggestedIngredients.join(', ')}
                        </p>
                      )}
                      {p.avoidIngredients?.length > 0 && (
                        <p className="text-red-700">
                          피하기: {p.avoidIngredients.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 분석 시작 버튼 */}
        <div className="shrink-0 border-t border-border bg-white/95 backdrop-blur-md px-4 py-3 safe-bottom">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || targets.length < 2}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {result ? '다시 분석하기' : '궁합 분석 시작'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RoutineCompatibilitySheet;
