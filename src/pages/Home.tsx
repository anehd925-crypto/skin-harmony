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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  Search,
  Sparkles,
  Tag,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── 필터 칩 ─── */
const FILTER_CHIPS = ['전체', '스킨케어', '세럼', '로션', '선크림', '마스크', '클렌저'] as const;
type FilterChip = typeof FILTER_CHIPS[number];

/* ─── 분석 결과 색상 ─── */
const gradeConfig = {
  good:     { label: '안전',  cls: 'bg-beneficial text-white' },
  moderate: { label: '보통',  cls: 'bg-caution text-white' },
  bad:      { label: '주의',  cls: 'bg-harmful text-white' },
} as const;
type Grade = keyof typeof gradeConfig;

const Home = () => {
  const { profile } = useUser();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [url, setUrl] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('전체');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = profile.nickname || (user?.email?.split('@')[0] ?? '');

  /* ── URL 분석 제출 ── */
  const handleAnalyze = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    navigate(`/analyzing?url=${encodeURIComponent(trimmed)}`);
  };

  /* ── 최근 분석 (3건) ── */
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

  /* ── 필터링 (카테고리는 아직 없으므로 전체만 활성화) ── */
  const filteredAnalysis = recentAnalysis; // category 컬럼 추가 후 필터링 적용 예정

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── 헤더 ── */}
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
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-xs font-bold ring-1 ring-brand-100"
            >
              {displayName.slice(0, 1).toUpperCase() || 'B'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero: URL 입력 ── */}
      <div className="bg-hero px-4 pt-6 pb-5">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <p className="text-xs font-semibold text-brand-600">AI 전성분 분석</p>
          </div>
          <h1 className="font-display text-display-sm font-semibold text-foreground mb-1">
            내 피부가 이해하는 성분
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            올리브영 URL을 붙여넣으면 AI가 성분을 분석해드려요
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="https://www.oliveyoung.co.kr/..."
              className="flex-1 bg-white/80 placeholder:text-muted-foreground/60 text-sm"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!url.trim()}
              size="icon"
              className="shrink-0"
              aria-label="분석 시작"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            예시: oliveyoung.co.kr/store/goods/getGoodsDetail...
          </p>
        </div>
      </div>

      {/* ── 필터 칩 ── */}
      <div className="mx-auto max-w-md">
        <div className="flex gap-2 overflow-x-auto hide-scroll px-4 py-3">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-base ease-brand',
                activeFilter === chip
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-border bg-white text-muted-foreground hover:border-brand-300',
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4">

        {/* ── 빠른 진입 카드 ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/scan')}
            className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-900">제품 스캔</p>
              <p className="text-xs text-brand-700/70 mt-0.5">바코드·OCR 분석</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100">
              <Clock className="h-5 w-5 text-ink-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">분석 기록</p>
              <p className="text-xs text-muted-foreground mt-0.5">지난 분석 보기</p>
            </div>
          </button>
        </div>

        {/* ── 올리브영 행사 ── */}
        <OliveYoungDealsCard />

        {/* ── 최근 분석 ── */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-semibold text-foreground">최근 분석</h2>
              </div>
              {recentAnalysis.length > 0 && (
                <button
                  onClick={() => navigate('/history')}
                  className="flex items-center gap-0.5 text-xs font-medium text-brand-700"
                >
                  전체 보기 <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {analysisLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 rounded-xl shimmer-bg" />
                ))}
              </div>
            ) : filteredAnalysis.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredAnalysis.map((a: {
                  id: string;
                  product_name: string;
                  product_brand: string;
                  overall_grade: string;
                  created_at: string;
                }) => {
                  const grade = (a.overall_grade as Grade) ?? 'moderate';
                  const config = gradeConfig[grade] ?? gradeConfig.moderate;
                  const d = new Date(a.created_at);
                  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate('/history')}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', config.cls)}>
                          {config.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                          {a.product_name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{a.product_brand}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Empty State ── */
              <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
                  <Tag className="h-6 w-6 text-brand-600" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  아직 분석 기록이 없어요
                </p>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  위 입력창에 올리브영 URL을 넣거나<br />
                  스캔 탭에서 바코드를 찍어보세요
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/scan')}
                  className="gap-1.5"
                >
                  스캔하러 가기 <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── AI 채팅 FAB ── */}
      <ChatFab />

      <BottomNav />
    </div>
  );
};

export default Home;
