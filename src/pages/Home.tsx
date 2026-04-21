import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import WeatherRoutineCard from '@/components/WeatherRoutineCard';
import RoutineSafetyCard from '@/components/RoutineSafetyCard';
import DailyMissionCard from '@/components/DailyMissionCard';
import NotificationPermission from '@/components/NotificationPermission';
import ChatFab from '@/components/ChatFab';
import OliveYoungDealsCard from '@/components/OliveYoungDealsCard';
import {
  Camera, ChevronRight, FlaskConical,
  BookMarked, ShieldAlert, TrendingUp,
  Grid3X3, X, Pill, Dna, Package, type LucideIcon,
} from 'lucide-react';

/* ─── 더보기 메뉴 항목 ─── */
interface MoreItem {
  Icon: LucideIcon;
  label: string;
  sub: string;
  path: string;
  color: string;
}

const MORE_ITEMS: MoreItem[] = [
  { Icon: ShieldAlert, label: '성분 블랙리스트', sub: '위험 성분 자동 경보', path: '/blacklist',     color: 'text-red-500 bg-red-50' },
  { Icon: TrendingUp,  label: '피부 타임라인',   sub: '변화 추세 시각화',   path: '/timeline',      color: 'text-indigo-600 bg-indigo-50' },
  { Icon: Pill,        label: '트러블 솔루션',   sub: '약국 의약품 추천',   path: '/skin-solution', color: 'text-rose-500 bg-rose-50' },
  { Icon: Dna,         label: '피부 진단',       sub: 'AI 타입 재진단',     path: '/onboarding',    color: 'text-cyan-600 bg-cyan-50' },
];

/* my_cabinet.category → 한글 라벨 (Home 미리보기용) */
const CATEGORY_LABEL: Record<string, string> = {
  cleansing_water: '클렌징워터',
  cleansing_oil: '클렌징오일',
  cleansing_foam: '클렌징폼',
  skincare: '스킨케어',
  suncare: '선케어',
  treatment: '트리트먼트',
  makeup: '메이크업',
  body: '바디',
  hair: '헤어',
};
const categoryLabel = (key: string) => CATEGORY_LABEL[key] ?? key;

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

  /* ── 내 보관함 요약 (총 개수 + 카테고리 미리보기) ── */
  const { data: cabinetSummary } = useQuery({
    queryKey: ['cabinet_summary_home', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, categories: [] as { key: string; count: number }[] };
      const { data } = await supabase
        .from('my_cabinet' as never)
        .select('category')
        .eq('user_id', user.id);
      const rows = (data ?? []) as { category: string }[];
      const counts = new Map<string, number>();
      rows.forEach(r => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
      const categories = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key, count]) => ({ key, count }));
      return { total: rows.length, categories };
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
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">BeautyLens</h1>
          <div className="flex items-center gap-2">
            {/* 할인 알림: 종 아이콘 토글 (구독 시 보라, 미구독 시 빨간 점) */}
            <NotificationPermission variant="icon" />
            <button
              onClick={() => navigate('/profile')}
              aria-label="프로필"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-foreground text-xs font-bold ring-1 ring-border"
            >
              {displayName.slice(0, 1).toUpperCase() || 'B'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">

        {/* ── 오늘의 미션 ── */}
        <DailyMissionCard />

        {/* ── Hero: 날씨 기반 루틴 추천 ── */}
        <WeatherRoutineCard period={currentPeriod} />

        {/* ── Today's Insights: 루틴 안전도 + 오늘 일기 ── */}
        <div className="grid grid-cols-2 gap-3">
          <RoutineSafetyCard compact />

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
                  <p className="text-xs text-muted-foreground font-medium">오늘 피부</p>
                  <p className="text-xl font-black text-foreground">{todayDiary.skin_score}<span className="text-xs font-medium text-muted-foreground ml-0.5">점</span></p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-foreground">피부 일기</p>
                  <p className="text-xs text-muted-foreground mt-0.5">오늘 기록하기</p>
                </>
              )}
            </div>
          </button>
        </div>

        {/* ── 내 보관함 진입 카드 ── */}
        <button
          onClick={() => navigate('/cabinet')}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card press text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
            <Package className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">내 화장품 보관함</p>
              {cabinetSummary && cabinetSummary.total > 0 && (
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                  {cabinetSummary.total}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {cabinetSummary && cabinetSummary.total > 0
                ? cabinetSummary.categories
                    .map(c => `${categoryLabel(c.key)} ${c.count}`)
                    .join(' · ')
                : '쓰는 제품을 등록하고 루틴·리뷰를 한 번에 관리하세요'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {/* ── 올리브영 행사·쿠폰 (외부 링크) ── */}
        <OliveYoungDealsCard />

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
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeColor[grade] ?? gradeColor.moderate}`}>
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

        {/* 분석 기록이 없을 때 온보딩 안내 */}
        {user && !analysisLoading && recentAnalysis.length === 0 && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-primary mx-auto mb-3">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">아직 분석 기록이 없어요</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              하단 <span className="font-semibold text-primary">스캔</span> 탭에서 화장품 성분을 분석해보세요
            </p>
          </div>
        )}

        {/* ── 더보기 (작게, 맨 아래로 이동) ── */}
        <button
          onClick={() => setShowMore(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-xs font-semibold text-muted-foreground press"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
          모든 기능 보기
        </button>

      </div>

      {/* ── 더보기 바텀시트 ── */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="relative w-full rounded-t-3xl bg-white px-4 pt-5 pb-10 safe-bottom animate-in slide-in-from-bottom duration-300">
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
                    <item.Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI 채팅 플로팅 버튼 + 시트 ── */}
      <ChatFab />

      <BottomNav />
    </div>
  );
};

export default Home;
