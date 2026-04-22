import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import NotificationPermission from '@/components/NotificationPermission';
import ChatFab from '@/components/ChatFab';
import OliveYoungDealsCard from '@/components/OliveYoungDealsCard';
import DailyMissionCard from '@/components/DailyMissionCard';
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  ScanLine,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── 분석 결과 색상 ─── */
const gradeConfig = {
  good:     { label: '안전', cls: 'bg-beneficial/15 text-beneficial', dot: 'bg-beneficial' },
  moderate: { label: '보통', cls: 'bg-caution/15 text-caution',   dot: 'bg-caution' },
  bad:      { label: '주의', cls: 'bg-harmful/15 text-harmful',    dot: 'bg-harmful' },
} as const;
type Grade = keyof typeof gradeConfig;

const Home = () => {
  const { profile } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = profile.nickname || (user?.email?.split('@')[0] ?? '');
  const skinLabel = profile.skinType ?? '';

  /* ── URL 분석 제출 ── */
  const handleAnalyze = () => {
    const trimmed = url.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    navigate(`/analyzing?url=${encodeURIComponent(trimmed)}`);
  };

  /* ── 최근 분석 (6건) ── */
  const { data: recentAnalysis = [], isLoading: analysisLoading } = useQuery({
    queryKey: ['recent_analysis_home', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('analysis_history')
        .select('id, product_name, product_brand, overall_grade, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ════ 헤더 ════ */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border pt-safe">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="font-display text-lg font-semibold tracking-tight text-brand-700">
            BeautyLens
          </span>
          <div className="flex items-center gap-2">
            <NotificationPermission variant="icon" />
            <button
              onClick={() => navigate('/profile')}
              aria-label="프로필"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white text-sm font-bold shadow-sm active:scale-95 transition-transform"
            >
              {displayName.slice(0, 1).toUpperCase() || 'B'}
            </button>
          </div>
        </div>
      </div>

      {/* ════ HERO — 그라디언트 배경 + URL 입력 ════ */}
      <div className="hero-brand px-4 pt-7 pb-8 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-md">
          {/* 인사 + 피부타입 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-white/80" />
              <span className="text-xs font-semibold text-white/90">
                {displayName ? `${displayName}님` : 'AI 전성분 분석'}
                {skinLabel ? ` · ${skinLabel}` : ''}
              </span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-white leading-snug mb-1">
            내 피부가 이해하는
            <br />성분 분석
          </h1>
          <p className="text-sm text-white/70 mb-5">
            올리브영 URL 하나로 AI가 성분을 분석해드려요
          </p>

          {/* URL 입력 + 분석 버튼 */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="oliveyoung.co.kr URL 붙여넣기"
              className="
                flex-1 h-12 rounded-xl bg-white/95 px-4
                text-sm text-foreground placeholder:text-muted-foreground/60
                border-0 outline-none shadow-md
                focus:ring-2 focus:ring-white/50
              "
            />
            <button
              onClick={handleAnalyze}
              aria-label="분석 시작"
              className="
                h-12 px-5 rounded-xl font-semibold text-sm
                bg-white text-brand-700 shadow-md
                active:scale-95 transition-transform
                disabled:opacity-50
              "
              disabled={!url.trim()}
            >
              분석
            </button>
          </div>

          {/* 또는 스캔 버튼 */}
          <button
            onClick={() => navigate('/scan')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            <ScanLine className="h-4 w-4" />
            바코드·OCR로 스캔하기
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 pt-5">

        {/* ════ 오늘의 미션 ════ */}
        <DailyMissionCard />

        {/* ════ 최근 분석 기록 ════ */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                  <TrendingUp className="h-4 w-4 text-brand-700" />
                </div>
                <h2 className="text-sm font-bold text-foreground">최근 분석</h2>
              </div>
              {recentAnalysis.length > 0 && (
                <button
                  onClick={() => navigate('/history')}
                  className="flex items-center gap-0.5 text-xs font-semibold text-brand-700 min-h-[44px] px-1"
                >
                  전체 보기 <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {analysisLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-28 rounded-2xl shimmer-bg" />
                ))}
              </div>
            ) : recentAnalysis.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {(recentAnalysis as Array<{
                  id: string;
                  product_name: string;
                  product_brand: string;
                  overall_grade: string;
                  created_at: string;
                }>).map(a => {
                  const grade = (a.overall_grade as Grade) ?? 'moderate';
                  const cfg = gradeConfig[grade] ?? gradeConfig.moderate;
                  const d = new Date(a.created_at);
                  const dateStr = `${d.getMonth() + 1}.${d.getDate()}`;
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate('/history')}
                      className="glass-card p-4 text-left press"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', cfg.dot)} />
                        <span className={cn('text-xs font-bold', cfg.cls.split(' ').filter(c => c.startsWith('text-')).join(' '))}>
                          {cfg.label}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{dateStr}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {a.product_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground truncate">{a.product_brand}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Empty State ── */
              <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                  <Tag className="h-7 w-7 text-brand-600" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">
                  아직 분석 기록이 없어요
                </p>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  위 입력창에 올리브영 URL을 넣거나<br />
                  스캔 버튼으로 바코드를 찍어보세요
                </p>
                <button
                  onClick={() => navigate('/scan')}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
                >
                  <FlaskConical className="h-4 w-4" />
                  지금 분석하러 가기 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>
        )}

        {/* ════ 올리브영 행사 (하단으로 이동) ════ */}
        <OliveYoungDealsCard />

      </div>

      <ChatFab />
      <BottomNav />
    </div>
  );
};

export default Home;
