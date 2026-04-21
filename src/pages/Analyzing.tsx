import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

/* 분석 중 화면에 순차적으로 보여줄 성분 샘플 */
const INGREDIENT_GLIMPSES = [
  '정제수', '글리세린', '나이아신아마이드', '히알루론산',
  '판테놀', '세라마이드', '부틸렌글라이콜', '베타인',
  '펩타이드', '콜라겐', '알로에베라', '녹차추출물',
  '카보머', '잔탄검', '토코페롤', '알란토인',
];

const STATUS_MESSAGES = [
  '제품 정보 가져오는 중...',
  '성분 목록 확인 중...',
  'AI가 성분을 분석하는 중...',
  '매치율 계산 중...',
  '분석 완료!',
];

export default function Analyzing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useUser();

  const url = searchParams.get('url') ?? '';
  const [visibleTags, setVisibleTags] = useState<string[]>([]);
  const [statusIdx, setStatusIdx] = useState(0);
  const tagTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!url) {
      navigate('/analyze', { replace: true });
      return;
    }

    const MIN_DURATION = 2400;
    const startTime = Date.now();

    /* 성분 태그 순차 등장 */
    tagTimerRef.current = setInterval(() => {
      setVisibleTags(prev => {
        if (prev.length >= INGREDIENT_GLIMPSES.length) return prev;
        return [...prev, INGREDIENT_GLIMPSES[prev.length]];
      });
    }, 180);

    /* 상태 문구 순환 */
    statusTimerRef.current = setInterval(() => {
      setStatusIdx(prev => Math.min(prev + 1, STATUS_MESSAGES.length - 2));
    }, 900);

    const run = async () => {
      const minDelay = new Promise<void>(r => setTimeout(r, MIN_DURATION));

      try {
        /* 1. 올리브영 스크래핑 */
        const { data: scraped, error: scrapeErr } = await supabase.functions.invoke(
          'scrape-oliveyoung',
          { body: { url } },
        );

        if (scrapeErr) throw new Error(scrapeErr.message);
        if (scraped?.error) throw new Error(scraped.error);

        /* 2. AI 성분 분석 */
        const userProfile = profile.skinType
          ? {
              skinType: profile.skinType,
              skinConcerns: profile.skinConcerns,
              skinSensitivity: profile.skinSensitivity,
              allergens: profile.allergies,
              specialCondition: profile.specialCondition,
            }
          : null;

        const { data: result, error: analyzeErr } = await supabase.functions.invoke(
          'analyze-ingredients',
          {
            body: {
              ingredientsText: scraped?.ingredientsText ?? '',
              productName: scraped?.productName ?? '',
              productBrand: scraped?.productBrand ?? '',
              userProfile,
            },
          },
        );

        if (analyzeErr) throw new Error(analyzeErr.message);
        if (result?.error) throw new Error(result.error);

        setStatusIdx(STATUS_MESSAGES.length - 1);
        await minDelay;

        navigate('/analyze', {
          state: {
            preloadedResult: result,
            productName: scraped?.productName ?? '',
            productBrand: scraped?.productBrand ?? '',
            ingredientsText: scraped?.ingredientsText ?? '',
            sourceUrl: url,
          },
          replace: true,
        });
      } catch (err) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_DURATION - elapsed);
        await new Promise<void>(r => setTimeout(r, remaining));

        navigate('/analyze', {
          state: {
            preloadError: err instanceof Error ? err.message : '분석 중 오류가 발생했어요',
            sourceUrl: url,
          },
          replace: true,
        });
      } finally {
        if (tagTimerRef.current) clearInterval(tagTimerRef.current);
        if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      }
    };

    run();

    return () => {
      if (tagTimerRef.current) clearInterval(tagTimerRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    };
  }, [url]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-forest grain-overlay overflow-hidden">

      {/* 상단 로고 */}
      <div className="w-full px-6 pt-safe pt-12">
        <span className="font-display text-lg font-semibold text-white/70">BeautyLens</span>
      </div>

      {/* 중앙: 제품 이미지 + 스캔 라인 */}
      <div className="flex flex-col items-center gap-8">
        <div className="relative h-44 w-44 overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
          {/* 제품 이미지 플레이스홀더 */}
          <div className="absolute inset-0 flex items-center justify-center text-6xl select-none">
            🧴
          </div>

          {/* 스캔 라인 (animate-scan CSS 애니메이션) */}
          <div className="animate-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" style={{
            boxShadow: '0 0 12px 2px hsl(var(--brand-300))',
          }} />
        </div>

        {/* 상태 문구 + 로딩 점 */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-base font-semibold text-white"
            >
              {STATUS_MESSAGES[statusIdx]}
            </motion.p>
          </AnimatePresence>

          <div className="mt-3 flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-brand-300"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 하단: 성분 태그 stagger 등장 */}
      <div className="w-full px-6 pb-safe pb-14">
        <p className="mb-3 text-center text-xs text-white/40 tracking-wide uppercase">
          감지된 성분
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {visibleTags.map(tag => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="animate-tag-in rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/75 backdrop-blur-sm"
              >
                {tag}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
