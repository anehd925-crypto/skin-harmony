/**
 * ImportFromAnalysesSheet
 * - 보관함 빈 상태(또는 사용자가 명시 호출)에서 호출
 * - 최근 분석 기록을 체크리스트로 노출 → 다중 선택 → 일괄로 my_cabinet INSERT
 * - 이미 보관함에 등록된 (이름+브랜드) 조합은 disabled + "등록됨" 표시
 * - 카테고리는 행별로 9개 칩 중 1개 선택 (디폴트: skincare)
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  CABINET_CATEGORIES, getCategoryDef, type CategoryKey,
} from '@/constants/cabinetCategories';
import { Check, Loader2, FlaskConical, Package, ShieldCheck, AlertTriangle } from 'lucide-react';

interface AnalysisRow {
  id: string;
  product_name: string;
  product_brand: string | null;
  overall_grade: string | null;
  created_at: string;
}

interface SelectionState {
  /** 선택된 분석 id Set */
  picked: Set<string>;
  /** 분석 id별 사용자가 고른 카테고리 (없으면 skincare) */
  cats: Map<string, CategoryKey>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 등록 완료 후 콜백 (보관함 reload 트리거 등) */
  onImported?: (insertedCount: number) => void;
}

const ImportFromAnalysesSheet = ({ open, onOpenChange, onImported }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [state, setState] = useState<SelectionState>({ picked: new Set(), cats: new Map() });
  const [saving, setSaving] = useState(false);

  /** name+brand 기반 dedup key */
  const keyOf = (name: string, brand: string | null | undefined) =>
    `${name.trim().toLowerCase()}::${(brand ?? '').trim().toLowerCase()}`;

  // 시트 열 때 데이터 로드
  useEffect(() => {
    if (!open || !user) return;
    setState({ picked: new Set(), cats: new Map() });
    setLoading(true);
    (async () => {
      // 최근 분석 기록 (최대 30건)
      const { data: hist } = await supabase
        .from('analysis_history')
        .select('id, product_name, product_brand, overall_grade, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      const rows = ((hist ?? []) as AnalysisRow[]);

      // 같은 (name+brand) 중복 분석은 가장 최신만 보여줌
      const dedup = new Map<string, AnalysisRow>();
      rows.forEach(r => {
        const k = keyOf(r.product_name, r.product_brand);
        if (!dedup.has(k)) dedup.set(k, r);
      });
      setAnalyses(Array.from(dedup.values()));

      // 보관함에 이미 있는 키 셋
      const { data: cab } = await supabase
        .from('my_cabinet' as never)
        .select('product_name, product_brand')
        .eq('user_id', user.id);
      const cabRows = ((cab ?? []) as { product_name: string; product_brand: string | null }[]);
      setExistingKeys(new Set(cabRows.map(c => keyOf(c.product_name, c.product_brand))));

      setLoading(false);
    })();
  }, [open, user]);

  const togglePick = (id: string) => {
    setState(prev => {
      const next = new Set(prev.picked);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, picked: next };
    });
  };

  const setCategoryFor = (id: string, cat: CategoryKey) => {
    setState(prev => {
      const next = new Map(prev.cats);
      next.set(id, cat);
      return { ...prev, cats: next };
    });
  };

  const selectableCount = useMemo(
    () => analyses.filter(a => !existingKeys.has(keyOf(a.product_name, a.product_brand))).length,
    [analyses, existingKeys],
  );

  const handleSelectAll = () => {
    setState(prev => {
      const next = new Set(prev.picked);
      const allSelected = analyses
        .filter(a => !existingKeys.has(keyOf(a.product_name, a.product_brand)))
        .every(a => next.has(a.id));
      analyses.forEach(a => {
        const dup = existingKeys.has(keyOf(a.product_name, a.product_brand));
        if (dup) return;
        if (allSelected) next.delete(a.id); else next.add(a.id);
      });
      return { ...prev, picked: next };
    });
  };

  const handleImport = async () => {
    if (!user) return;
    if (state.picked.size === 0) {
      toast({ title: '추가할 제품을 선택해주세요', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const targets = analyses.filter(a => state.picked.has(a.id));
    const payloads = targets.map(a => {
      const cat = state.cats.get(a.id) ?? 'skincare';
      const def = getCategoryDef(cat);
      return {
        user_id: user.id,
        product_name: a.product_name,
        product_brand: a.product_brand,
        category: cat,
        step_order: def.defaultStep,
        is_morning: def.defaultMorning,
        is_evening: def.defaultEvening,
        notes: null,
        analysis_history_id: a.id,
        image_url: null,
        product_url: null,
      };
    });

    const { error } = await supabase.from('my_cabinet' as never).insert(payloads);
    setSaving(false);

    if (error) {
      toast({ title: '일괄 추가 실패', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: `${payloads.length}개 제품을 보관함에 추가했어요`,
      description: '카테고리·단계는 보관함에서 언제든 수정할 수 있어요.',
    });
    onImported?.(payloads.length);
    onOpenChange(false);
  };

  const gradeColor = (g: string | null | undefined) =>
    g === 'good' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : g === 'bad' ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-amber-600 bg-amber-50 border-amber-200';
  const gradeLabel = (g: string | null | undefined) =>
    g === 'good' ? '안전' : g === 'bad' ? '주의' : '보통';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[88vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-left flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-600" />
            최근 분석에서 보관함에 가져오기
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            이미 분석한 제품을 한 번에 보관함으로 옮길 수 있어요. 카테고리는 행별로 1탭 선택.
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-neutral-200 animate-pulse" />)}
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
              <FlaskConical className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-bold text-foreground">아직 분석 기록이 없어요</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                스캔 탭에서 화장품 성분을 한 번 분석해보세요.<br />
                분석한 제품은 여기서 한 번에 보관함으로 옮길 수 있어요.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 전체 선택 */}
              {selectableCount > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-violet-600 underline underline-offset-2"
                >
                  추가 가능한 {selectableCount}건 전체 선택/해제
                </button>
              )}

              {analyses.map(a => {
                const dupKey = existingKeys.has(keyOf(a.product_name, a.product_brand));
                const picked = state.picked.has(a.id);
                const cat = state.cats.get(a.id) ?? 'skincare';
                const date = new Date(a.created_at);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border transition-colors ${
                      dupKey ? 'border-border bg-neutral-50 opacity-70'
                      : picked ? 'border-violet-400 bg-violet-50/40'
                      : 'border-border bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={dupKey}
                      onClick={() => togglePick(a.id)}
                      className="w-full flex items-start gap-3 px-3 pt-3 pb-2 text-left disabled:cursor-not-allowed"
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        dupKey ? 'border-border bg-white'
                        : picked ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-border bg-white'
                      }`}>
                        {picked && !dupKey && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.product_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.product_brand ?? '브랜드 미상'}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-semibold ${gradeColor(a.overall_grade)}`}>
                            {a.overall_grade === 'bad'
                              ? <AlertTriangle className="h-2.5 w-2.5" />
                              : <ShieldCheck className="h-2.5 w-2.5" />}
                            {gradeLabel(a.overall_grade)}
                          </span>
                          <span className="text-xs text-muted-foreground">{dateStr}</span>
                          {dupKey && (
                            <span className="rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                              이미 보관함에 있음
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* 선택된 행만 카테고리 칩 노출 (스크롤 가로) */}
                    {picked && !dupKey && (
                      <div className="px-3 pb-3 border-t border-violet-200/60 mt-1 pt-2">
                        <p className="text-xs font-semibold text-violet-700 mb-1.5">카테고리</p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {CABINET_CATEGORIES.map(c => {
                            const active = cat === c.key;
                            return (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => setCategoryFor(a.id, c.key)}
                                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                  active
                                    ? 'border-violet-500 bg-violet-100 text-violet-700 font-bold'
                                    : 'border-border bg-white text-muted-foreground'
                                }`}
                              >
                                {c.emoji} {c.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="shrink-0 border-t border-border bg-white/95 backdrop-blur-md px-4 py-3 safe-bottom">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              선택한 제품 <span className="font-bold text-foreground">{state.picked.size}</span>개
            </p>
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={saving || state.picked.size === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            선택한 제품 보관함에 추가
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ImportFromAnalysesSheet;
