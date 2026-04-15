import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import WeatherRoutineCard from '@/components/WeatherRoutineCard';
import RoutineSafetyCard from '@/components/RoutineSafetyCard';
import {
  Camera, ChevronRight, FlaskConical, Sparkles,
  Layers, BookMarked, ShieldAlert, Package, TrendingUp,
  Grid3X3, X, Pill,
} from 'lucide-react';

/* ─── 더보기 메뉴 항목 ─── */
const MORE_ITEMS = [
  { icon: <Layers className="h-5 w-5" />,      label: '루틴 체커',      sub: '성분 궁합 분析',     path: '/routine',       color: 'text-violet-600 bg-violet-50' },
  { icon: <BookMarked className="h-5 w-5" />,  label: '피부 일기',      sub: 'AI 인사이트 기록',   path: '/diary',         color: 'text-emerald-600 bg-emerald-50' },
  { icon: <Package className="h-5 w-5" />,     label: '내 보관함',      sub: '날씨 맞춤 루틴',     path: '/cabinet',       color: 'text-amber-600 bg-amber-50' },
  { icon: <ShieldAlert className="h-5 w-5" />, label: '성분 블랙리스트', sub: '위험 성분 자동 경보', path: '/blacklist',     color: 'text-red-500 bg-red-50' },
  { icon: <TrendingUp className="h-5 w-5" />,  label: '피부 타임라인',   sub: '변화 추세 시각화',   path: '/timeline',      color: 'text-indigo-600 bg-indigo-50' },
  { icon: <Pill className="h-5 w-5" />,        label: '트러블 솔루션',   sub: '약국 의약품 추천',   path: '/skin-solution', color: 'text-rose-500 bg-rose-50' },
];

const gradeColor = {
  good:     'text-emerald-600 bg-emerald-50 border-emerald-200',
  moderate: 'text-amber-600  bg-amber-50  border-amber-200',
  bad:      'text-red-600    bg-red-50    border-red-200',
};
const gradeLabel = { good: '안전', moderate: '보통', bad: '주의' };

const Home = () => {
  const { profile } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentPeriod: 'morning' | 'evening' = new Date().getHours() < 14 ? 'morning' : 'evening';
  const greetingPeriod = new Date().getHours() < 12 ? '좋은 아침' : new Date().getHours() < 18 ? '안녕하세요' : '좋은 저녁';

  const [showMore, setShowMore] = useState(false);

  /* ── 최근 분석 3건 ── */
  const { data: recentAnalysis = [], isLoading: analysisLoading } = useQuery({
    queryKey: ['recent_analysis_home', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('analysis_history')
        .select('id, product_name, product_brand, overall_grade, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  /* ── 오늘 피부 일기 작성 여부 ── */
  const { data: todayDiary } = useQuery({
    queryKey: ['today_diary', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('skin_diary')
        .select('id, skin_score')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile.nickname || (user?.email?.split('@')[0] ?? '');

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">

      {/* ── 헤더 ── */}
      <div className="gradient-brand px-5 pb-6 pt-14 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-white/50" />
            <span className="text-[11px] font-semibold text-white/50 tracking-widest uppercase">BeautyLens</span>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 text-xs font-bold ring-1 ring-white/15"
          >
            {displayName.slice(0, 1).toUpperCase() || 'B'}
          </button>
        </div>

        <div className="mt-5">
          <p className="text-sm text-white/40 font-medium">{greetingPeriod}</p>
          <h1 className="mt-1 text-[26px] font-black text-white leading-[1.15] tracking-tight">
            {profile.skinType
              ? <>{profile.skinType} 피부를 위한<br /><span className="text-white/70">오늘의 루틴이에요</span></>
              : <>내 피부에 맞는<br /><span className="text-white/70">성분을 분석해요</span></>
            }
          </h1>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">

        {/* ── Hero: 날씨 기반 루틴 추천 ── */}
        <WeatherRoutineCard period={currentPeriod} />

        {/* ── Primary CTA: 성분 스캔 ── */}
        <button
          onClick={() => navigate('/scan')}
          className="flex w-full items-center gap-4 rounded-2xl gradient-primary px-5 py-4 text-left shadow-primary press"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-white">성분 스캔</p>
            <p className="text-xs text-white/60 mt-0.5">URL · 카메라 · 직접입력으로 즉시 분석</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/50 shrink-0" />
        </button>

        {/* ── Today's Insights: 루틴 안전도 + 오늘 일기 ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* 루틴 안전도 — 미니 카드 */}
          <RoutineSafetyCard compact />

          {/* 오늘 피부 일기 — 미니 카드 */}
          <button
            onClick={() => navigate('/diary')}
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-card press text-left min-h-[100px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                <BookMarked className="h-4 w-4 text-emerald-600" />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div>
              {todayDiary ? (
                <>
                  <p className="text-[10px] text-muted-foreground font-medium">오늘 피부</p>
                  <p className="text-xl font-black text-foreground">{todayDiary.skin_score}<span className="text-xs font-medium text-muted-foreground ml-0.5">점</span></p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-foreground">피부 일기</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">오늘 기록하기</p>
                </>
              )}
            </div>
          </button>
        </div>

        {/* ── 더보기 버튼 → 바텀시트 ── */}
        <button
          onClick={() => setShowMore(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3.5 text-sm font-semibold text-muted-foreground press"
        >
          <Grid3X3 className="h-4 w-4" />
          모든 기능 보기
        </button>

        {/* ── 최근 분석 피드 ── */}
        {user && (analysisLoading || recentAnalysis.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">최근 분석</h2>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-0.5 text-xs text-primary font-medium"
              >
                전체 보기 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {analysisLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentAnalysis.map((a: {
                  id: string; product_name: string; product_brand: string;
                  overall_grade: string; created_at: string;
                }) => {
                  const grade = a.overall_grade as 'good' | 'moderate' | 'bad';
                  const d = new Date(a.created_at);
                  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate('/history')}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
                    >
                      <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{a.product_name}</p>
                        <p className="text-xs text-muted-foreground">{a.product_brand}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${gradeColor[grade] ?? gradeColor.moderate}`}>
                          {gradeLabel[grade] ?? '보통'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 분析 기록이 없을 때 온보딩 안내 */}
        {user && !analysisLoading && recentAnalysis.length === 0 && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-primary mx-auto mb-3">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">아직 분析 기록이 없어요</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              화장품 성분을 스캔하면<br />내 피부에 맞는지 바로 확인할 수 있어요
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="rounded-xl gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-primary press"
            >
              첫 번째 성분 분析하기
            </button>
          </div>
        )}

      </div>

      {/* ── 더보기 바텀시트 ── */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* 딤 배경 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          {/* 시트 */}
          <div className="relative w-full rounded-t-3xl bg-white px-5 pt-5 pb-10 safe-bottom animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-foreground">모든 기능</h3>
              <button
                onClick={() => setShowMore(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setShowMore(false); }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-neutral-50 p-4 text-center transition-all active:scale-95"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-foreground leading-tight">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
