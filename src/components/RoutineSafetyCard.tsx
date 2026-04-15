import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

interface RoutineSafetyData {
  score: number;           // 0–100
  label: string;
  level: 'safe' | 'warning' | 'danger';
  conflictCount: number;
  synergyCount: number;
  topConflict: string | null;
}

/**
 * 홈 화면 상단 고정 카드 — 오늘 루틴 성분 안전도 점수
 * 루틴 데이터가 없으면 렌더링하지 않음
 */
const RoutineSafetyCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<RoutineSafetyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadRoutineSafety();
  }, [user]);

  const loadRoutineSafety = async () => {
    setLoading(true);
    try {
      // 오늘 날짜 기준 루틴 제품 가져오기 (morning + evening)
      const { data: routines } = await supabase
        .from('routines')
        .select('id, name, routine_products(product_name, ingredients_snapshot)')
        .eq('user_id', user!.id)
        .in('name', ['morning', 'evening']);

      if (!routines || routines.length === 0) { setLoading(false); return; }

      // 모든 루틴 제품의 성분을 합산
      let totalProducts = 0;
      const allIngredients: string[] = [];
      for (const r of routines as Array<{ routine_products: Array<{ ingredients_snapshot: string }> }>) {
        for (const p of r.routine_products) {
          totalProducts++;
          if (p.ingredients_snapshot) {
            allIngredients.push(p.ingredients_snapshot);
          }
        }
      }

      if (totalProducts < 2) { setLoading(false); return; }

      // 가장 최근에 저장된 conflict check 결과가 있으면 활용, 없으면 간단 계산
      // 여기서는 루틴 제품 수와 성분 수 기반 간략 점수만 계산
      // (실제 AI 충돌 분석은 /routine 페이지에서 수행)
      const { data: conflictCache } = await supabase
        .from('routine_conflict_cache' as never)
        .select('score, conflict_count, synergy_count, top_conflict')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictCache) {
        const c = conflictCache as { score: number; conflict_count: number; synergy_count: number; top_conflict: string | null };
        setData(buildData(c.score, c.conflict_count, c.synergy_count, c.top_conflict));
      } else {
        // 캐시 없으면 제품 수 기반 기본 점수
        const base = Math.max(50, 100 - totalProducts * 5);
        setData(buildData(base, 0, 0, null));
      }
    } catch (e) {
      console.error('RoutineSafetyCard 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const buildData = (score: number, conflictCount: number, synergyCount: number, topConflict: string | null): RoutineSafetyData => {
    let label = '안전';
    let level: 'safe' | 'warning' | 'danger' = 'safe';
    if (score < 60) { label = '주의 필요'; level = 'danger'; }
    else if (score < 80) { label = '약간 주의'; level = 'warning'; }
    return { score, label, level, conflictCount, synergyCount, topConflict };
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-neutral-200 animate-pulse" />
            <div className="h-2 w-full rounded-full bg-neutral-200 animate-pulse" />
          </div>
          <div className="h-4 w-4 rounded bg-neutral-200 animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const colorMap = {
    safe: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-400', icon: 'text-green-500' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-400', icon: 'text-yellow-500' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-400', icon: 'text-red-500' },
  };
  const c = colorMap[data.level];

  return (
    <button
      type="button"
      onClick={() => navigate('/routine')}
      className={`flex w-full items-center gap-3 rounded-2xl border ${c.border} ${c.bg} px-4 py-3.5 text-left transition-all active:scale-[0.98]`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm`}>
        {data.level === 'safe'
          ? <ShieldCheck className={`h-5 w-5 ${c.icon}`} />
          : <AlertTriangle className={`h-5 w-5 ${c.icon}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-bold ${c.text}`}>오늘 루틴 안전도</p>
          {data.conflictCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              충돌 {data.conflictCount}
            </span>
          )}
          {data.synergyCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
              <Zap className="inline h-2.5 w-2.5" /> 시너지 {data.synergyCount}
            </span>
          )}
        </div>
        {/* 점수 바 */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-white/60">
            <div
              className={`h-full rounded-full ${c.bar} transition-all duration-700`}
              style={{ width: `${data.score}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${c.text}`}>{data.score}점</span>
        </div>
        {data.topConflict && (
          <p className={`mt-0.5 text-[10px] ${c.text} opacity-80 truncate`}>⚠ {data.topConflict}</p>
        )}
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 ${c.icon}`} />
    </button>
  );
};

export default RoutineSafetyCard;
