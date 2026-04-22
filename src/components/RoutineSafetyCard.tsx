import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

interface RoutineSafetyData {
  score: number;
  label: string;
  level: 'safe' | 'warning' | 'danger';
  conflictCount: number;
  synergyCount: number;
  topConflict: string | null;
}

const buildData = (
  score: number,
  conflictCount: number,
  synergyCount: number,
  topConflict: string | null,
): RoutineSafetyData => {
  let label = '안전';
  let level: 'safe' | 'warning' | 'danger' = 'safe';
  if (score < 60) { label = '주의 필요'; level = 'danger'; }
  else if (score < 80) { label = '약간 주의'; level = 'warning'; }
  return { score, label, level, conflictCount, synergyCount, topConflict };
};

/**
 * 홈 화면 루틴 안전도 카드
 * compact=true → 2열 그리드 내 작은 카드 버전
 */
const RoutineSafetyCard = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<RoutineSafetyData | null>(null);
  const [loading, setLoading] = useState(true);

  // buildData를 컴포넌트 외부로 이동했으므로 useCallback 의존성 문제 없음
  const loadRoutineSafety = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // 옵션 B 적용: 루틴 정보는 my_cabinet 단일 소스에서 읽는다.
      // 오전(is_morning) / 저녁(is_evening) 둘 중 하나라도 표시된 제품이면 루틴 대상.
      const { data: cabinet } = await supabase
        .from('my_cabinet')
        .select('id, is_morning, is_evening')
        .eq('user_id', user.id);

      const routineItems = (cabinet ?? []).filter(
        (c) => c.is_morning === true || c.is_evening === true,
      );

      const totalProducts = routineItems.length;
      if (totalProducts < 2) { setLoading(false); return; }

      const { data: conflictCache } = await supabase
        .from('routine_conflict_cache' as never)
        .select('score, conflict_count, synergy_count, top_conflict')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictCache) {
        const c = conflictCache as { score: number; conflict_count: number; synergy_count: number; top_conflict: string | null };
        setData(buildData(c.score, c.conflict_count, c.synergy_count, c.top_conflict));
      } else {
        const base = Math.max(50, 100 - totalProducts * 5);
        setData(buildData(base, 0, 0, null));
      }
    } catch (e) {
      console.error('RoutineSafetyCard 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRoutineSafety();
  }, [loadRoutineSafety]);

  const colorMap = {
    safe:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-400',  icon: 'text-green-500' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-400', icon: 'text-yellow-500' },
    danger:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-400',    icon: 'text-red-500' },
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card min-h-[100px]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-neutral-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
            <div className="h-2 w-full rounded-full bg-neutral-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    if (compact) {
      return (
        <button
          onClick={() => navigate('/cabinet', { state: { openRoutineSheet: true } })}
          className="flex flex-col justify-between rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-4 text-left min-h-[100px] transition-all active:scale-[0.98]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100">
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">루틴 안전도</p>
            <p className="text-xs text-muted-foreground mt-0.5">루틴 등록 후 확인</p>
          </div>
        </button>
      );
    }
    return null;
  }

  const c = colorMap[data.level];

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate('/cabinet', { state: { openRoutineSheet: true } })}
        className={`flex flex-col justify-between rounded-2xl border ${c.border} ${c.bg} p-4 text-left min-h-[100px] transition-all active:scale-[0.98]`}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card shadow-sm">
            {data.level === 'safe'
              ? <ShieldCheck className={`h-4 w-4 ${c.icon}`} />
              : <AlertTriangle className={`h-4 w-4 ${c.icon}`} />
            }
          </div>
          <ChevronRight className={`h-3.5 w-3.5 ${c.icon}`} />
        </div>
        <div>
          <p className={`text-xs font-semibold ${c.text}`}>루틴 안전도</p>
          <p className={`text-lg font-black ${c.text}`}>{data.score}<span className="text-xs font-normal ml-0.5">점</span></p>
          <div className="mt-1 h-1 rounded-full bg-white/60">
            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${data.score}%` }} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/cabinet', { state: { openRoutineSheet: true } })}
      className={`flex w-full items-center gap-3 rounded-2xl border ${c.border} ${c.bg} px-4 py-3.5 text-left transition-all active:scale-[0.98]`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm">
        {data.level === 'safe'
          ? <ShieldCheck className={`h-5 w-5 ${c.icon}`} />
          : <AlertTriangle className={`h-5 w-5 ${c.icon}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-bold ${c.text}`}>오늘 루틴 안전도</p>
          {data.conflictCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">
              충돌 {data.conflictCount}
            </span>
          )}
          {data.synergyCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-600">
              <Zap className="inline h-2.5 w-2.5" /> 시너지 {data.synergyCount}
            </span>
          )}
        </div>
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
          <p className={`mt-0.5 text-xs ${c.text} opacity-80 truncate`}>⚠ {data.topConflict}</p>
        )}
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 ${c.icon}`} />
    </button>
  );
};

export default RoutineSafetyCard;
