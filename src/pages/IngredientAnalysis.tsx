import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBack } from '@/hooks/use-back';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import SafetyBadge from '@/components/SafetyBadge';
import BlacklistAlert from '@/components/BlacklistAlert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { syncBlacklist, checkBlacklistHits } from '@/utils/blacklist';
import { track, EVENT } from '@/lib/analytics';
import { ChevronLeft, Search, ShieldCheck, AlertTriangle, Loader2, Link2, History, Share2, Check, Zap, Star, Users, BellPlus, ListTree, Info, ChevronRight, BellRing, Package } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { registerDiscountAlert } from '@/utils/discountAlert';
import AddToCabinetSheet from '@/components/AddToCabinetSheet';

interface AnalyzedIngredient {
  name: string;
  name_en: string;
  safety: 'safe' | 'caution' | 'danger';
  function?: string;
  description: string;
  irritancy?: number;
  comedogenicity?: number;
}

interface IngredientInteraction {
  ingredient_a: string;
  ingredient_b: string;
  type: 'conflict' | 'caution' | 'synergy';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface KeyIngredient {
  name: string;
  role: string;
}

interface ProductTags {
  skin_types: string[];
  skin_concerns: string[];
  suitable_sensitivity: string[];
  suitable_age_groups: string[];
  avoid_skin_conditions: string[];
  description_ko: string;
}

interface SkinFit {
  score: number;
  label: '최적' | '적합' | '보통' | '주의';
  reason: string;
  warnings: string[];
}

interface SearchSource {
  url: string;
  title: string;
}

interface AnalysisResult {
  productName: string;
  productBrand: string;
  ingredients: AnalyzedIngredient[];
  interactions?: IngredientInteraction[];
  keyIngredients?: KeyIngredient[];
  overallGrade: 'good' | 'moderate' | 'bad';
  summary: string;
  productTags?: ProductTags;
  skinFit?: SkinFit;
  searchSources?: SearchSource[];
  groundingUsed?: boolean;
  ingredientsFound?: boolean;
  confidence?: number;
  confidenceReason?: string;
  ingredientCount?: number;
}

const AnalysisFeedback = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const handleVote = async (v: 'up' | 'down') => {
    if (vote) return;
    setVote(v);
    try {
      await supabase.from('feedback' as never).insert({
        user_id: user?.id ?? null,
        type: 'analysis_result',
        rating: v === 'up' ? 5 : 1,
        message: v === 'up' ? '분석 결과가 도움이 됐어요' : '분석 결과가 도움이 되지 않았어요',
        metadata: {},
      });
    } catch {
      // 무음 처리 — UX 방해 없이
    }
    toast({ title: v === 'up' ? '좋은 피드백 감사합니다!' : '개선에 반영하겠습니다.' });
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">이 분석 결과가 도움이 됐나요?</p>
      <div className="flex gap-2">
        <button
          onClick={() => handleVote('up')}
          disabled={!!vote}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            vote === 'up' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background hover:border-primary/40'
          }`}
        >
          👍 도움됐어요
        </button>
        <button
          onClick={() => handleVote('down')}
          disabled={!!vote}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            vote === 'down' ? 'bg-muted-foreground/20 text-foreground' : 'border border-border bg-background hover:border-primary/40'
          }`}
        >
          👎 별로예요
        </button>
      </div>
    </div>
  );
};

const IngredientAnalysis = () => {
  const navigate = useNavigate();
  const goBack = useBack('/scan');
  const location = useLocation();
  const { profile } = useUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [blacklistHits, setBlacklistHits] = useState<string[]>([]);

  // Analyzing 페이지에서 사전 로딩된 결과 또는 OCR/ScanHub 진입 처리
  useEffect(() => {
    const state = location.state as {
      preloadedResult?: AnalysisResult;
      preloadError?: string;
      sourceUrl?: string;
      productName?: string;
      productBrand?: string;
      ingredientsText?: string;
      prefilledIngredients?: string;
      fromScan?: boolean;
      initialMode?: 'url' | 'text' | 'product';
    } | null;

    if (state?.preloadedResult) {
      // Analyzing 페이지에서 이미 분석 완료 → 결과 바로 표시
      setResult(state.preloadedResult);
      if (state.sourceUrl) setUrlInput(state.sourceUrl);
      if (state.productName) setProductName(state.productName);
      if (state.productBrand) setProductBrand(state.productBrand);
      if (state.ingredientsText) setIngredientsText(state.ingredientsText);
      window.history.replaceState({}, '');
    } else if (state?.preloadError) {
      // Analyzing 페이지에서 오류 발생 → 에러 메시지 + URL 모드로 폴백
      setError(state.preloadError);
      if (state.sourceUrl) setUrlInput(state.sourceUrl);
      window.history.replaceState({}, '');
    } else if (state?.prefilledIngredients) {
      setMode('text');
      setIngredientsText(state.prefilledIngredients);
      window.history.replaceState({}, '');
    } else if (state?.initialMode === 'product') {
      setMode('text');
      if (state.productName) setProductName(state.productName);
      if (state.productBrand) setProductBrand(state.productBrand);
      window.history.replaceState({}, '');
    } else if (state?.initialMode === 'url' || state?.initialMode === 'text') {
      setMode(state.initialMode);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleShare = async () => {
    if (!result) return;
    const safeCount = result.ingredients.filter(i => i.safety === 'safe').length;
    const cautionCount = result.ingredients.filter(i => i.safety === 'caution').length;
    const dangerCount = result.ingredients.filter(i => i.safety === 'danger').length;
    const gradeText = result.overallGrade === 'good' ? '✅ 안전' : result.overallGrade === 'bad' ? '⚠️ 주의' : '🟡 보통';

    const text = `[BeautyLens 전성분 분석 결과]
제품명: ${result.productName}
브랜드: ${result.productBrand}
종합 등급: ${gradeText}
${result.summary}

성분 현황: 안전 ${safeCount}개 · 주의 ${cautionCount}개 · 위험 ${dangerCount}개

주요 성분:
${result.ingredients.slice(0, 5).map(i => `• ${i.name} (${i.safety === 'safe' ? '안전' : i.safety === 'danger' ? '위험' : '주의'})`).join('\n')}

BeautyLens로 분석했습니다`;

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('scrape-oliveyoung', {
        body: { url: urlInput },
      });
      if (fnError) {
        let msg = fnError.message;
        try {
          const context = (fnError as { context?: Response }).context;
          if (context && typeof context.json === 'function') {
            const body = await context.clone().json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const pName = data.productName || '';
      const pBrand = data.productBrand || '';
      const pIngredients = data.ingredientsText || '';
      const goodsNo = data.goodsNo || '';
      const productId = data.productId || '';

      if (pName) setProductName(pName);
      if (pBrand) setProductBrand(pBrand);
      if (pIngredients) setIngredientsText(pIngredients);

      // 상품명이 없으면 goodsNo / productId를 AI 힌트로 사용
      const aiName = pName
        || (goodsNo ? `올리브영 코스메틱 상품 코드 ${goodsNo}. 이 코드의 실제 상품명을 알면 그 성분을 분석하고, 모르면 올리브영 인기 스킨케어 제품의 일반적인 성분으로 분석해주세요.` : '')
        || (productId ? `쿠팡 상품 코드 ${productId}. 이 코드의 실제 상품명을 알면 그 성분을 분석하고, 모르면 일반적인 스킨케어 제품 성분으로 분석해주세요.` : '');

      if (!aiName && !pIngredients) {
        setUrlLoading(false);
        setMode('text');
        setError('상품 정보를 가져오지 못했습니다. 상품명과 전성분을 직접 입력해주세요.');
        return;
      }

      setUrlLoading(false);
      await handleAnalyzeWithData(pIngredients, aiName, pBrand);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setUrlLoading(false);
    }
  };

  const handleAnalyzeWithData = async (text: string, pName: string, pBrand: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    track(EVENT.ANALYSIS_STARTED, { has_url: !!urlInput.trim(), has_profile: !!profile.skinType });

    // 피부 프로필이 설정된 경우 함께 전송
    const userProfile = profile.skinType ? {
      skinType: profile.skinType,
      skinConcerns: profile.skinConcerns,
      concernPriority: profile.concernPriority,
      skinSensitivity: profile.skinSensitivity,
      skinCondition: profile.skinCondition,
      ageGroup: profile.ageGroup,
      allergies: profile.allergies,
      avoidIngredients: profile.avoidIngredients,
      specialCondition: profile.specialCondition,
    } : null;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-ingredients', {
        body: {
          ingredientsText: text,
          productName: pName,
          productBrand: pBrand,
          userProfile,
        },
      });

      if (fnError) {
        let msg = fnError.message;
        try {
          const context = (fnError as { context?: Response }).context;
          if (context && typeof context.json === 'function') {
            const body = await context.clone().json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        if (msg.includes('non-2xx') || msg.includes('401') || msg.includes('Unauthorized')) {
          throw new Error('로그인 세션이 만료되었습니다. 프로필 탭에서 로그아웃 후 다시 로그인해주세요.');
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);
      track(EVENT.ANALYSIS_COMPLETED, {
        overall_grade: analysisResult.overallGrade,
        skin_fit_score: analysisResult.skinFit?.score ?? null,
        ingredient_count: analysisResult.ingredients?.length ?? 0,
      });

      // 분석 성공 이후 후속 저장/동기화는 실패해도 본 결과 화면을 훼손하지 않는다.
      // 사용자에게는 비차단 토스트로만 알린다.
      try {
        if (urlInput.trim()) {
          const tags = analysisResult.productTags;
          const { error: upsertErr } = await supabase.from('products').upsert({
            name: analysisResult.productName || pName || '이름 없음',
            brand: analysisResult.productBrand || pBrand || '',
            category: 'skincare',
            product_url: urlInput.trim(),
            ingredients_text: text,
            overall_grade: analysisResult.overallGrade,
            ...(tags && {
              skin_types: tags.skin_types,
              skin_concerns: tags.skin_concerns,
              suitable_sensitivity: tags.suitable_sensitivity,
              suitable_age_groups: tags.suitable_age_groups,
              avoid_skin_conditions: tags.avoid_skin_conditions,
              description: tags.description_ko,
              ai_tagged_at: new Date().toISOString(),
            }),
          }, { onConflict: 'product_url', ignoreDuplicates: false });
          if (upsertErr) console.error('[analyze] products upsert 실패:', upsertErr.message);
        }

        if (user) {
          const { data: histRow, error: histErr } = await supabase
            .from('analysis_history')
            .insert({
              user_id: user.id,
              product_name: analysisResult.productName || pName || '이름 없음',
              product_brand: analysisResult.productBrand || pBrand || '',
              ingredients_text: text,
              result: analysisResult as unknown as Record<string, unknown>,
              overall_grade: analysisResult.overallGrade,
              skin_fit_score: analysisResult.skinFit?.score ?? null,
              ...(urlInput.trim() && { product_url: urlInput.trim() }),
            })
            .select('id')
            .single();
          if (histErr) {
            console.error('[analyze] analysis_history insert 실패:', histErr.message);
            toast({
              title: '분석 기록 저장 실패',
              description: '결과는 확인하실 수 있지만 기록에는 남지 않았습니다.',
            });
          } else {
            setLastAnalysisId((histRow as { id: string } | null)?.id ?? null);
          }

          try {
            await syncBlacklist(user.id, analysisResult.ingredients);
            const hits = await checkBlacklistHits(user.id, analysisResult.ingredients);
            setBlacklistHits(hits);
          } catch (e) {
            console.error('[analyze] blacklist sync 실패:', e);
          }
        }
      } catch (postErr) {
        console.error('[analyze] 후처리 실패:', postErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      setError(message);
      track(EVENT.ANALYSIS_FAILED, { message });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!ingredientsText.trim()) {
      setError('전성분 목록을 입력해주세요.');
      return;
    }
    await handleAnalyzeWithData(ingredientsText, productName, productBrand);
  };

  const allergyMatches = result?.ingredients.filter(i =>
    profile.allergies.some(a =>
      i.name.includes(a) || i.name_en.toLowerCase().includes(a.toLowerCase())
    )
  ) ?? [];

  const safeCount = result?.ingredients.filter(i => i.safety === 'safe').length ?? 0;
  const cautionCount = result?.ingredients.filter(i => i.safety === 'caution').length ?? 0;
  const dangerCount = result?.ingredients.filter(i => i.safety === 'danger').length ?? 0;

  // 할인 알림 등록 상태
  const [alertingDiscount, setAlertingDiscount] = useState(false);
  const [alertRegistered, setAlertRegistered] = useState(false);

  // 보관함 추가 시트
  const [cabinetSheetOpen, setCabinetSheetOpen] = useState(false);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  const handleAddDiscountAlert = async () => {
    if (!result || !user) {
      if (!user) {
        toast({ title: '로그인이 필요합니다', description: '할인 알림을 받으려면 로그인해 주세요.' });
        navigate('/auth');
      }
      return;
    }
    setAlertingDiscount(true);
    try {
      const res = await registerDiscountAlert({
        userId: user.id,
        name: result.productName,
        brand: result.productBrand,
        category: 'skincare',
        productUrl: urlInput.trim() || null,
      });
      if (res.ok) {
        setAlertRegistered(true);
        toast({
          title: res.reason === 'already_registered' ? '이미 등록된 알림이에요' : '할인 알림을 등록했어요',
          description: '가격이 내려가면 푸시로 알려드릴게요.',
        });
      } else {
        toast({ title: '알림 등록 실패', description: res.message ?? '잠시 후 다시 시도해주세요.', variant: 'destructive' });
      }
    } finally {
      setAlertingDiscount(false);
    }
  };

  // 종합 등급 라벨/색
  const gradeMeta = (g?: 'good' | 'moderate' | 'bad') => {
    if (g === 'good') return { label: '안전', color: 'text-beneficial', bg: 'bg-beneficial/10', border: 'border-beneficial/30', Icon: ShieldCheck };
    if (g === 'bad') return { label: '주의', color: 'text-harmful', bg: 'bg-harmful/10', border: 'border-harmful/30', Icon: AlertTriangle };
    return { label: '보통', color: 'text-caution', bg: 'bg-caution/10', border: 'border-caution/30', Icon: AlertTriangle };
  };

  // 매칭 점수 색상 톤
  const fitTone = (score?: number) => {
    if (score === undefined) return { text: 'text-muted-foreground', bg: 'bg-muted', bar: 'bg-muted-foreground/30', chip: 'bg-muted text-muted-foreground' };
    if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500', chip: 'bg-green-100 text-green-700' };
    if (score >= 60) return { text: 'text-primary', bg: 'bg-primary/10', bar: 'bg-primary', chip: 'bg-primary/15 text-primary' };
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', chip: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border pt-safe px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">성분 분석</h1>
        </div>
        <button onClick={() => navigate('/history')} className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <History className="h-3.5 w-3.5" />분석 기록
        </button>
      </div>

      <div className="px-4">
        {!result && (
          <div className="-mt-4 space-y-4">

            {/* URL 붙여넣기 — 메인 입력 */}
            {mode === 'url' && (
              <div className="space-y-3">
                {/* 안내 카드 */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
                  <Link2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-foreground">올리브영 URL 붙여넣기</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      URL만 넣으면 AI가 전성분을 찾아 자동으로 분석해드립니다.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://www.oliveyoung.co.kr/... 또는 oy.run/..."
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="rounded-lg text-sm"
                    />
                    <Button
                      onClick={handleFetchFromUrl}
                      disabled={urlLoading || loading || !urlInput.trim()}
                      className="shrink-0 rounded-lg"
                    >
                      {urlLoading || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '분석'}
                    </Button>
                  </div>

                  {/* 분석 진행 상태 안내 */}
                  {(urlLoading || loading) && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                      <p className="text-xs text-primary">
                        {urlLoading ? '상품 정보 가져오는 중...' : 'AI가 전성분 정보를 검색하고 분석 중입니다...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 직접 입력 전환 링크 */}
                <button
                  onClick={() => setMode('text')}
                  className="w-full py-2 text-xs text-muted-foreground underline underline-offset-2"
                >
                  URL이 없으신가요? 전성분 직접 입력하기
                </button>
              </div>
            )}

            {/* 직접 입력 — 보조 수단 */}
            {mode === 'text' && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('url')}
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />URL 붙여넣기로 돌아가기
                </button>

                <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
                  <p className="text-sm font-semibold text-foreground">전성분 직접 입력</p>
                  <p className="text-xs text-muted-foreground">
                    올리브영 상품 페이지 → 상품정보제공고시 → 전성분 복사 후 붙여넣기
                  </p>
                  <Input placeholder="제품명 (선택)" value={productName} onChange={e => setProductName(e.target.value)} className="rounded-lg" />
                  <Input placeholder="브랜드 (선택)" value={productBrand} onChange={e => setProductBrand(e.target.value)} className="rounded-lg" />
                  <Textarea
                    placeholder="정제수, 글리세린, 부틸렌글라이콜, 나이아신아마이드, ..."
                    value={ingredientsText}
                    onChange={e => setIngredientsText(e.target.value)}
                    className="min-h-[150px] rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-harmful text-center">{error}</p>
            )}

            {/* 직접 입력 모드일 때만 분석하기 버튼 표시 */}
            {mode === 'text' && (
              <Button
                onClick={handleAnalyze}
                disabled={loading || !ingredientsText.trim()}
                className="w-full rounded-xl h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    성분 분석하기
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {result && (() => {
          const grade = gradeMeta(result.overallGrade);
          const fit = fitTone(result.skinFit?.score);
          const interactionsCount = result.interactions?.length ?? 0;
          const fitLabel = result.skinFit
            ? (result.skinFit.score >= 90 ? '퍼펙트 매치'
              : result.skinFit.score >= 80 ? '최적'
              : result.skinFit.score >= 60 ? '적합'
              : result.skinFit.score >= 40 ? '보통' : '주의')
            : null;

          return (
          <div className="-mt-2 space-y-3">
            {/* P0: 블랙리스트 경보 + 알레르기 (안전 관련 최우선) */}
            <BlacklistAlert hits={blacklistHits} />
            {allergyMatches.length > 0 && (
              <div className="rounded-2xl border border-harmful/30 bg-harmful/5 p-3">
                <p className="text-xs font-semibold text-harmful flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> 알레르기 성분 감지
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name).join(', ')}</p>
              </div>
            )}

            {/* P1: 메인 카드 — 제품명/브랜드 + 매칭 점수 + 종합 등급을 한 장에 */}
            <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              {/* 헤더: 제품 정보 + 알림 등록 */}
              <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-foreground leading-tight">{result.productName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{result.productBrand}</p>
                  {result.groundingUsed && (
                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                      <Search className="h-2.5 w-2.5" />실시간 검색
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAddDiscountAlert}
                  disabled={alertingDiscount || alertRegistered}
                  className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors ${
                    alertRegistered
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20 disabled:opacity-60'
                  }`}
                >
                  {alertingDiscount ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : alertRegistered ? <BellRing className="h-3.5 w-3.5" />
                    : <BellPlus className="h-3.5 w-3.5" />}
                  {alertRegistered ? '알림 ON' : '할인 알림'}
                </button>
              </div>

              {/* 본문: 매칭 점수 + 등급 통합 */}
              <div className="px-4 pb-4 space-y-3">
                {result.skinFit ? (
                  <div className="rounded-2xl bg-muted border border-border/60 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${fit.bg}`}>
                        <span className={`text-xl font-black ${fit.text}`}>{result.skinFit.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground">내 피부 매칭</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${fit.chip}`}>{fitLabel}</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-1.5 mt-2">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${fit.bar}`}
                               style={{ width: `${result.skinFit.score}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">{result.skinFit.reason}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-left flex items-center gap-2.5"
                  >
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs font-semibold text-primary flex-1">프로필 설정 후 매칭 점수 확인</p>
                    <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
                  </button>
                )}

                {/* 종합 등급 + 안전 통계 */}
                <div className={`rounded-2xl border ${grade.border} ${grade.bg} px-3 py-2.5`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <grade.Icon className={`h-4 w-4 shrink-0 ${grade.color}`} />
                      <span className={`text-sm font-bold ${grade.color}`}>{grade.label}</span>
                    </div>
                    <div className="flex gap-2.5 text-[11px] shrink-0">
                      <span className="text-beneficial font-semibold">안전 {safeCount}</span>
                      <span className="text-caution font-semibold">주의 {cautionCount}</span>
                      <span className="text-harmful font-semibold">위험 {dangerCount}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{result.summary}</p>
                </div>

                {/* 매칭 경고 (있으면 1줄로 압축) */}
                {result.skinFit?.warnings && result.skinFit.warnings.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-700 leading-snug">
                      {result.skinFit.warnings.join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* P2: 핵심 성분 (상단에 압축 표시) */}
            {result.keyIngredients && result.keyIngredients.length > 0 && (
              <div className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="h-3.5 w-3.5 text-caution fill-current" />
                  <h3 className="text-xs font-bold text-foreground">핵심 성분</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.keyIngredients.slice(0, 6).map((ki, idx) => (
                    <span key={idx} className="rounded-full bg-primary/10 border border-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {ki.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* P3: 상세 진입점 (시트 팝업) */}
            <div className="grid grid-cols-2 gap-2">
              {/* 전성분 상세 */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-3 text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <ListTree className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">전성분 보기</p>
                        <p className="text-[10px] text-muted-foreground">{result.ingredients.length}개</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
                  <SheetHeader>
                    <SheetTitle className="text-left">전성분 분석 ({result.ingredients.length}개)</SheetTitle>
                  </SheetHeader>
                  <div className="mt-3 space-y-2 pb-8">
                    {result.ingredients.map((ingredient, idx) => (
                      <div key={idx} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{ingredient.name}</p>
                              {ingredient.function && (
                                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{ingredient.function}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{ingredient.name_en}</p>
                            {(ingredient.irritancy !== undefined || ingredient.comedogenicity !== undefined) && (
                              <div className="flex gap-2 mt-1">
                                {ingredient.irritancy !== undefined && (
                                  <span className={`text-[11px] font-medium ${ingredient.irritancy >= 3 ? 'text-harmful' : ingredient.irritancy >= 1 ? 'text-caution' : 'text-muted-foreground'}`}>
                                    자극 {ingredient.irritancy}/5
                                  </span>
                                )}
                                {ingredient.comedogenicity !== undefined && (
                                  <span className={`text-[11px] font-medium ${ingredient.comedogenicity >= 3 ? 'text-harmful' : ingredient.comedogenicity >= 1 ? 'text-caution' : 'text-muted-foreground'}`}>
                                    모공 {ingredient.comedogenicity}/5
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <SafetyBadge safety={ingredient.safety} />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{ingredient.description}</p>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* 성분 상호작용 */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    disabled={interactionsCount === 0}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-3 text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className="h-4 w-4 text-caution shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">성분 상호작용</p>
                        <p className="text-[10px] text-muted-foreground">
                          {interactionsCount > 0 ? `${interactionsCount}건` : '없음'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] overflow-y-auto rounded-t-3xl">
                  <SheetHeader>
                    <SheetTitle className="text-left">성분 상호작용 ({interactionsCount}건)</SheetTitle>
                  </SheetHeader>
                  <div className="mt-3 space-y-2 pb-8">
                    {result.interactions?.map((interaction, idx) => {
                      const isConflict = interaction.type === 'conflict';
                      const isSynergy = interaction.type === 'synergy';
                      const severityBg = isConflict
                        ? interaction.severity === 'high' ? 'border-harmful/30 bg-harmful/5' : 'border-caution/30 bg-caution/5'
                        : isSynergy ? 'border-beneficial/30 bg-beneficial/5' : 'border-caution/20 bg-caution/5';
                      const icon = isConflict ? '⚡' : isSynergy ? '✨' : '⚠️';
                      const typeLabel = isConflict ? '충돌' : isSynergy ? '시너지' : '주의';
                      const typeColor = isConflict ? 'text-harmful' : isSynergy ? 'text-beneficial' : 'text-caution';
                      return (
                        <div key={idx} className={`rounded-xl border p-3 ${severityBg}`}>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-xs">{icon}</span>
                            <span className={`text-xs font-bold ${typeColor}`}>{typeLabel}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs font-medium text-foreground">{interaction.ingredient_a}</span>
                            <span className="text-xs text-muted-foreground">+</span>
                            <span className="text-xs font-medium text-foreground">{interaction.ingredient_b}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">{interaction.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* P4: 액션 영역 */}
            {/* 메인 CTA: 보관함에 1탭 추가 */}
            <Button
              onClick={() => setCabinetSheetOpen(true)}
              className="w-full rounded-xl h-12 gap-1.5 text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Package className="h-4 w-4" />
              내 보관함에 추가하기
            </Button>

            {/* 보조 액션 */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleShare} variant="outline" className="rounded-xl h-11 gap-1.5 text-sm">
                {copied ? <><Check className="h-4 w-4 text-beneficial" />복사됨</> : <><Share2 className="h-4 w-4" />공유</>}
              </Button>
              <Button
                onClick={() => {
                  const params = new URLSearchParams({
                    title: `${result.productName} 성분 분석 결과`,
                    body: result.summary,
                    product_name: result.productName,
                    product_brand: result.productBrand,
                    overall_grade: result.overallGrade,
                  });
                  navigate(`/community?${params.toString()}`);
                }}
                variant="outline"
                className="rounded-xl h-11 gap-1.5 text-sm border-primary/40 text-primary"
              >
                <Users className="h-4 w-4" />커뮤니티
              </Button>
            </div>

            <Button
              onClick={() => { setResult(null); setIngredientsText(''); setProductName(''); setProductBrand(''); setUrlInput(''); setBlacklistHits([]); setAlertRegistered(false); }}
              variant="outline"
              className="w-full rounded-xl h-11 text-sm"
            >
              다른 제품 분석하기
            </Button>

            {/* 피드백 */}
            <AnalysisFeedback />

            {/* P5: 보조 정보 (작게, 하단) */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground">
                      분석 신뢰도 {typeof result.confidence === 'number' ? `${result.confidence}%` : '—'}
                      {result.searchSources && result.searchSources.length > 0 && ` · 출처 ${result.searchSources.length}개`}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="text-left">분석 정보 · 신뢰도 · 출처</SheetTitle>
                </SheetHeader>
                <div className="mt-3 space-y-3 pb-8">
                  {typeof result.confidence === 'number' && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground">분석 신뢰도</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                          result.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          result.confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-muted text-muted-foreground'
                        }`}>{result.confidence}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${
                          result.confidence >= 80 ? 'bg-emerald-500' :
                          result.confidence >= 60 ? 'bg-amber-500' : 'bg-neutral-400'
                        }`} style={{ width: `${result.confidence}%` }} />
                      </div>
                      {result.confidenceReason && (
                        <p className="mt-2 text-[11px] text-muted-foreground leading-snug">{result.confidenceReason}</p>
                      )}
                    </div>
                  )}

                  {/* AI 추정 안내 — 보조 정보로 이동 + 직접 입력 진입점은 이 안에만 1번 */}
                  {result.ingredientsFound === false && (
                    <div className="rounded-xl border border-caution/30 bg-caution/5 p-3 flex gap-2 items-start">
                      <AlertTriangle className="h-4 w-4 text-caution shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-caution">AI 추정 성분 기반 분석</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          실제 전성분을 찾지 못해 유사 제품 성분으로 추정했습니다. 정확한 분석이 필요하면 전성분을 직접 입력해주세요.
                        </p>
                        <button
                          onClick={() => {
                            setResult(null);
                            setMode('text');
                            setProductName(result.productName);
                            setProductBrand(result.productBrand);
                          }}
                          className="mt-1.5 text-[11px] font-semibold text-caution underline underline-offset-2"
                        >
                          전성분 직접 입력하기 →
                        </button>
                      </div>
                    </div>
                  )}

                  {result.searchSources && result.searchSources.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-bold text-foreground mb-2">참고 출처 (Google Search)</p>
                      <div className="space-y-1">
                        {result.searchSources.map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-primary truncate hover:underline"
                          >
                            <Search className="h-2.5 w-2.5 shrink-0" />
                            {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800 leading-relaxed">
                    AI가 제공하는 참고 정보입니다. 의학적 진단·처방을 대체하지 않으며, 민감성 피부 또는 알레르기가 있는 경우 전문가와 상담하시기 바랍니다.
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* AI 추정 안내가 있을 때만 결과 화면 본문에 작은 1줄 알림 (간결) */}
            {result.ingredientsFound === false && (
              <p className="text-center text-[10px] text-caution">
                ⚠ 일부 성분은 AI 추정값입니다. 정확도가 필요하면 위 정보 시트에서 직접 입력으로 전환하세요.
              </p>
            )}
          </div>
          );
        })()}
      </div>

      <BottomNav />

      {/* 보관함 1탭 추가 시트 */}
      {result && (
        <AddToCabinetSheet
          open={cabinetSheetOpen}
          onOpenChange={setCabinetSheetOpen}
          product={{
            name: result.productName,
            brand: result.productBrand,
            imageUrl: null,
            productUrl: urlInput.trim() || null,
            analysisHistoryId: lastAnalysisId,
          }}
        />
      )}
    </div>
  );
};

export default IngredientAnalysis;
