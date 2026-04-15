import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, TrendingUp, TrendingDown, Minus,
  Layers, BookMarked, ChevronRight, Info, Loader2,
} from 'lucide-react';

interface DiaryEntry {
  id: string;
  date: string;
  skin_score: number;
  trouble_spots: string[];
  notes: string;
}

interface RoutineChange {
  date: string;
  type: 'added' | 'removed';
  product_name: string;
  routine_name: string;
}

interface TimelinePoint {
  date: string;
  score: number | null;
  routineChanges: RoutineChange[];
}

const SCORE_EMOJI: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😊', 5: '😄' };

const SkinTimeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [period, setPeriod] = useState<'30' | '60' | '90'>('30');

  useEffect(() => {
    if (user) loadData();
  }, [user, period]);

  const loadData = async () => {
    setLoading(true);
    setInsight(null);
    try {
      const days = parseInt(period);
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().split('T')[0];

      // 피부 일기 로드
      const { data: diaryData } = await supabase
        .from('skin_diary')
        .select('id, date, skin_score, trouble_spots, notes')
        .eq('user_id', user!.id)
        .gte('date', fromStr)
        .order('date', { ascending: true });

      const entries: DiaryEntry[] = (diaryData ?? []) as DiaryEntry[];

      // 루틴 변경 이력: routine_products의 created_at 활용
      const { data: rpData } = await supabase
        .from('routine_products')
        .select('id, product_name, created_at, routines(name, user_id)')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: true });

      const routineChanges: RoutineChange[] = ((rpData ?? []) as Array<{
        product_name: string;
        created_at: string;
        routines: { name: string; user_id: string } | null;
      }>)
        .filter(rp => rp.routines?.user_id === user!.id)
        .map(rp => ({
          date: rp.created_at.split('T')[0],
          type: 'added' as const,
          product_name: rp.product_name,
          routine_name: rp.routines?.name ?? 'morning',
        }));

      // 날짜 범위를 합쳐 timeline 생성
      const dateMap = new Map<string, TimelinePoint>();
      for (const e of entries) {
        dateMap.set(e.date, { date: e.date, score: e.skin_score, routineChanges: [] });
      }
      for (const rc of routineChanges) {
        if (!dateMap.has(rc.date)) {
          dateMap.set(rc.date, { date: rc.date, score: null, routineChanges: [] });
        }
        dateMap.get(rc.date)!.routineChanges.push(rc);
      }

      const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setPoints(sorted);

      // 간단 인사이트 계산
      if (entries.length >= 3) {
        const scores = entries.map(e => e.skin_score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const recentAvg = scores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
        if (recentAvg > avg + 0.3) {
          setInsight(`최근 5일 평균 ${recentAvg.toFixed(1)}점으로 전체 평균(${avg.toFixed(1)}점)보다 좋아지고 있어요.`);
        } else if (recentAvg < avg - 0.3) {
          setInsight(`최근 5일 평균 ${recentAvg.toFixed(1)}점으로 전체 평균(${avg.toFixed(1)}점)보다 낮아지고 있어요. 루틴을 점검해보세요.`);
        } else {
          setInsight(`피부 상태가 평균 ${avg.toFixed(1)}점으로 안정적으로 유지되고 있어요.`);
        }
      }
    } catch (e) {
      console.error('타임라인 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const scorePoints = points.filter(p => p.score !== null);
  const maxScore = 5;
  const chartWidth = Math.max(scorePoints.length * 40, 300);

  const trendIcon = () => {
    if (scorePoints.length < 2) return null;
    const first = scorePoints[0].score!;
    const last = scorePoints[scorePoints.length - 1].score!;
    if (last > first) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (last < first) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">내 피부 변화 타임라인</h1>
          <p className="text-xs text-muted-foreground">피부 점수 + 루틴 변경 이력을 한눈에</p>
        </div>
        <div className="flex gap-1">
          {(['30', '60', '90'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-neutral-100'
              }`}
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BookMarked className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">아직 기록이 없어요</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            피부 일기를 작성하고 루틴을 등록하면<br />변화 타임라인이 여기에 표시돼요
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => navigate('/diary')}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              피부 일기 작성
            </button>
            <button
              onClick={() => navigate('/routine')}
              className="rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary"
            >
              루틴 등록
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 px-4 pt-5">
          {/* AI 인사이트 배너 */}
          {insight && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-2.5 items-start">
              <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700">AI 인사이트</p>
                <p className="mt-0.5 text-xs text-blue-600 leading-relaxed">{insight}</p>
              </div>
            </div>
          )}

          {/* 점수 추세 차트 */}
          {scorePoints.length >= 2 && (
            <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">피부 점수 추세</p>
                  {trendIcon()}
                </div>
                <span className="text-xs text-muted-foreground">{scorePoints.length}개 기록</span>
              </div>
              {/* SVG 라인 차트 */}
              <div
                className="overflow-x-auto px-2 pb-3"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
              >
                <svg
                  width={chartWidth}
                  height={100}
                  viewBox={`0 0 ${chartWidth} 100`}
                  className="overflow-visible"
                >
                  {/* 배경 그리드 */}
                  {[1, 2, 3, 4, 5].map(s => {
                    const y = 10 + (maxScore - s) * (80 / (maxScore - 1));
                    return (
                      <line key={s} x1={0} x2={chartWidth} y1={y} y2={y}
                        stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3" />
                    );
                  })}
                  {/* 라인 */}
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={scorePoints.map((p, i) => {
                      const x = 20 + i * 40;
                      const y = 10 + (maxScore - p.score!) * (80 / (maxScore - 1));
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* 면적 */}
                  <polygon
                    fill="hsl(var(--primary) / 0.08)"
                    points={[
                      ...scorePoints.map((p, i) => {
                        const x = 20 + i * 40;
                        const y = 10 + (maxScore - p.score!) * (80 / (maxScore - 1));
                        return `${x},${y}`;
                      }),
                      `${20 + (scorePoints.length - 1) * 40},95`,
                      `20,95`,
                    ].join(' ')}
                  />
                  {/* 데이터 포인트 */}
                  {scorePoints.map((p, i) => {
                    const x = 20 + i * 40;
                    const y = 10 + (maxScore - p.score!) * (80 / (maxScore - 1));
                    const isLast = i === scorePoints.length - 1;
                    return (
                      <g key={p.date}>
                        <circle cx={x} cy={y} r={isLast ? 5 : 4}
                          fill={isLast ? 'hsl(var(--primary))' : 'white'}
                          stroke="hsl(var(--primary))" strokeWidth={2} />
                        {isLast && (
                          <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fill="hsl(var(--primary))" fontWeight="bold">
                            {SCORE_EMOJI[p.score!]}
                          </text>
                        )}
                        {/* x축 날짜 레이블 */}
                        <text x={x} y={98} textAnchor="middle" fontSize={8} fill="#9ca3af">
                          {p.date.slice(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* 타임라인 이벤트 목록 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">이벤트 기록</p>
            <div className="relative">
              {/* 타임라인 수직선 */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4 pl-10">
                {[...points].reverse().map((point, i) => {
                  const hasDiary = point.score !== null;
                  const hasChange = point.routineChanges.length > 0;
                  if (!hasDiary && !hasChange) return null;

                  const d = new Date(point.date);
                  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일`;

                  return (
                    <div key={point.date} className="relative">
                      {/* 타임라인 마커 */}
                      <div className={`absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                        hasDiary ? 'bg-primary' : 'bg-orange-400'
                      }`}>
                        {hasDiary
                          ? <span className="text-[8px] text-white font-bold">{point.score}</span>
                          : <Layers className="h-2.5 w-2.5 text-white" />
                        }
                      </div>

                      <div className="rounded-2xl border border-border bg-white shadow-card p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-foreground">{dateLabel}</p>
                          {hasDiary && (
                            <span className="text-sm">{SCORE_EMOJI[point.score!]}</span>
                          )}
                        </div>

                        {hasDiary && point.score !== null && (
                          <div className="mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${(point.score / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-primary">{point.score}/5</span>
                            </div>
                          </div>
                        )}

                        {hasChange && (
                          <div className="space-y-1">
                            {point.routineChanges.map((rc, j) => (
                              <div key={j} className="flex items-center gap-1.5">
                                <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                                  루틴 {rc.type === 'added' ? '추가' : '제거'}
                                </span>
                                <span className="text-xs text-foreground truncate">{rc.product_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 바로가기 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/diary')}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-3.5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">피부 일기 작성</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/routine')}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-3.5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-semibold text-foreground">루틴 관리</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SkinTimeline;
