import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { track, EVENT } from '@/lib/analytics';
import { Target, ChevronRight, Check, Sparkles } from 'lucide-react';

// ─── 7일 미션 시퀀스 정의 ──────────────────────────────────────────────────
interface Mission {
  key: string;
  day: number;
  title: string;
  subtitle: string;
  path: string;
  cta: string;
  // 완료 조건: DB 체크 쿼리
  checker: (userId: string) => Promise<boolean>;
}

const checkTable = async (
  userId: string,
  table: 'analysis_history' | 'my_cabinet' | 'skin_diary',
  extraFilter?: (q: ReturnType<typeof supabase.from>) => unknown,
): Promise<boolean> => {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (extraFilter) query = extraFilter(query) as typeof query;
  const { count } = await query;
  return (count ?? 0) > 0;
};

const MISSIONS: Mission[] = [
  {
    key: 'day1_first_analysis',
    day: 1,
    title: '첫 성분 분석 완료',
    subtitle: '관심 제품 1개를 분석해보세요',
    path: '/scan',
    cta: '분석 시작',
    checker: (uid) => checkTable(uid, 'analysis_history'),
  },
  {
    key: 'day2_set_profile',
    day: 2,
    title: '피부 프로필 완성',
    subtitle: '맞춤 분석을 위해 피부 타입을 알려주세요',
    path: '/profile',
    cta: '프로필 설정',
    checker: async (uid) => {
      const { data } = await supabase
        .from('profiles').select('skin_type').eq('user_id', uid).maybeSingle();
      return !!(data as { skin_type?: string | null } | null)?.skin_type;
    },
  },
  {
    key: 'day3_add_cabinet',
    day: 3,
    title: '보관함에 제품 추가',
    subtitle: '사용 중인 제품 1개를 등록해보세요',
    path: '/cabinet',
    cta: '보관함 열기',
    checker: (uid) => checkTable(uid, 'my_cabinet'),
  },
  {
    key: 'day4_first_diary',
    day: 4,
    title: '첫 피부 일기 작성',
    subtitle: '오늘의 피부 상태를 기록해보세요',
    path: '/diary',
    cta: '일기 쓰기',
    checker: (uid) => checkTable(uid, 'skin_diary'),
  },
  {
    key: 'day5_rate_product',
    day: 5,
    title: '제품 평가 남기기',
    subtitle: '보관함 제품에 별점을 매겨보세요',
    path: '/cabinet',
    cta: '평가하기',
    checker: async (uid) => {
      const { count } = await supabase
        .from('my_cabinet' as never)
        .select('id', { count: 'exact', head: true })
        .eq('user_id' as never, uid)
        .not('my_rating' as never, 'is', null);
      return (count ?? 0) > 0;
    },
  },
  {
    key: 'day6_routine_check',
    day: 6,
    title: '루틴 궁합 점검',
    subtitle: '내 루틴의 성분 궁합을 AI가 분석해줍니다',
    path: '/cabinet',
    cta: '보관함 열기',
    // 옵션 B 적용 후: my_cabinet에 제품이 2개 이상 있으면 궁합 분석 가능
    checker: async (uid) => {
      const { count } = await supabase
        .from('my_cabinet' as never)
        .select('id', { count: 'exact', head: true })
        .eq('user_id' as never, uid);
      return (count ?? 0) >= 2;
    },
  },
  {
    key: 'day7_weekly_report',
    day: 7,
    title: '주간 리포트 확인',
    subtitle: 'AI 코치의 첫 주 피부 리포트를 받아보세요',
    path: '/myskin',
    cta: '리포트 보기',
    // 일기 3건 이상 + 주간 리포트 페이지(/myskin) 진입 기록이 있어야 완료 처리
    checker: async (uid) => {
      const { count: diaryCount } = await supabase
        .from('skin_diary' as never)
        .select('id', { count: 'exact', head: true })
        .eq('user_id' as never, uid);
      if ((diaryCount ?? 0) < 3) return false;
      const { count: viewCount } = await supabase
        .from('app_events' as never)
        .select('id', { count: 'exact', head: true })
        .eq('user_id' as never, uid)
        .eq('event_name' as never, 'coach_report_viewed');
      return (viewCount ?? 0) > 0;
    },
  },
];

const DailyMissionCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const evaluate = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: savedMissions } = await supabase
      .from('user_missions' as never)
      .select('mission_key, completed_at')
      .eq('user_id' as never, user.id);

    const saved = new Set(
      ((savedMissions ?? []) as Array<{ mission_key: string; completed_at: string | null }>)
        .filter((m) => !!m.completed_at)
        .map((m) => m.mission_key),
    );

    // 순서대로 돌며 아직 완료되지 않은 첫 번째 미션 탐색
    let next: Mission | null = null;
    for (const m of MISSIONS) {
      if (saved.has(m.key)) continue;
      const done = await m.checker(user.id);
      if (done) {
        // 자동으로 완료 기록
        await supabase.from('user_missions' as never).upsert({
          user_id: user.id,
          mission_key: m.key,
          completed_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id,mission_key' });
        saved.add(m.key);
        track(EVENT.MISSION_COMPLETED, { mission_key: m.key, day: m.day });
        continue;
      }
      next = m;
      break;
    }

    setCompletedKeys(saved);
    setCurrentMission(next);
    setLoading(false);
  }, [user]);

  useEffect(() => { void evaluate(); }, [evaluate]);

  if (!user || loading) return null;

  // 모든 미션 완료
  if (!currentMission) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-emerald-800">7일 미션 완주 완료</p>
          <p className="text-xs text-emerald-700/80 mt-0.5">BeautyLens의 모든 핵심 기능을 경험하셨어요</p>
        </div>
      </div>
    );
  }

  const doneCount = completedKeys.size;
  const progress = Math.round((doneCount / MISSIONS.length) * 100);

  return (
    <button
      onClick={() => {
        track(EVENT.MISSION_CTA_CLICKED, { mission_key: currentMission.key, day: currentMission.day });
        navigate(currentMission.path);
      }}
      className="w-full rounded-2xl border border-primary/20 bg-white p-4 text-left shadow-card press"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Day {currentMission.day}/7</span>
            <span className="text-[10px] text-muted-foreground">· 오늘의 미션</span>
          </div>
          <p className="text-sm font-bold text-foreground mt-0.5 truncate">{currentMission.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentMission.subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </div>

      {/* 진행률 바 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
          {doneCount}/{MISSIONS.length}
        </span>
      </div>

      {/* 최근 완료된 미션들 */}
      {doneCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from(completedKeys).slice(0, 3).map((k) => {
            const m = MISSIONS.find((x) => x.key === k);
            if (!m) return null;
            return (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Check className="h-2.5 w-2.5" />
                Day {m.day}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
};

export default DailyMissionCard;
