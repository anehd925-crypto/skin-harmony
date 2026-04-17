import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { ChevronLeft, Search, FlaskConical, ShieldCheck, AlertTriangle, Loader2, Link2, History, Share2, Check, Zap, Star, Users } from 'lucide-react';

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
  const location = useLocation();
  const { profile } = useUser();
  const { user } = useAuth();
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

  // OCR 스캔에서 돌아올 때 성분 텍스트 자동 입력, ScanHub에서 초기 모드 지정
  useEffect(() => {
    const state = location.state as { prefilledIngredients?: string; fromScan?: boolean; initialMode?: 'url' | 'text' | 'product'; productName?: string; productBrand?: string } | null;
    if (state?.prefilledIngredients) {
      setMode('text');
      setIngredientsText(state.prefilledIngredients);
      window.history.replaceState({}, '');
    } else if (state?.initialMode === 'product' && state?.productName) {
      // 제품명 검색으로 진입 → text 모드로 전환 후 제품명/브랜드 채우기
      setMode('text');
      setProductName(state.productName);
      if (state.productBrand) setProductBrand(state.productBrand);
      window.history.replaceState({}, '');
    } else if (state?.initialMode) {
      setMode(state.initialMode as 'url' | 'text');
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
        if (upsertErr) console.error('products upsert 실패:', upsertErr.message);
      }

      if (user) {
        const { error: histErr } = await supabase.from('analysis_history').insert({
          user_id: user.id,
          product_name: analysisResult.productName || pName || '이름 없음',
          product_brand: analysisResult.productBrand || pBrand || '',
          ingredients_text: text,
          result: analysisResult as unknown as Record<string, unknown>,
          overall_grade: analysisResult.overallGrade,
          skin_fit_score: analysisResult.skinFit?.score ?? null,
          ...(urlInput.trim() && { product_url: urlInput.trim() }),
        });
        if (histErr) console.error('analysis_history insert 실패:', histErr.message);

        // 블랙리스트 자동 동기화 & 경보 체크
        await syncBlacklist(user.id, analysisResult.ingredients);
        const hits = await checkBlacklistHits(user.id, analysisResult.ingredients);
        setBlacklistHits(hits);
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

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">성분 분석</h1>
        </div>
        <button onClick={() => navigate('/history')} className="flex items-center gap-1 rounded-full border border-border bg-neutral-50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
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
              <p className="text-sm text-danger text-center">{error}</p>
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

        {result && (
          <div className="-mt-4 space-y-4">
            {/* 블랙리스트 경보 배너 — 최상단 */}
            <BlacklistAlert hits={blacklistHits} />

            {/* Product header */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground">{result.productName}</h2>
                  <p className="text-sm text-muted-foreground">{result.productBrand}</p>
                </div>
                {result.groundingUsed && (
                  <span className="shrink-0 flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-xs font-medium text-blue-600">
                    <Search className="h-3 w-3" />실시간 검색
                  </span>
                )}
              </div>
            </div>

            {/* AI 추정 성분 안내 배너 */}
            {result.ingredientsFound === false && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-warning">AI 추정 성분 기반 분석</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    실제 전성분을 찾지 못해 유사 제품 성분으로 추정했습니다. 정확한 분석을 위해 전성분을 직접 입력해 주세요.
                  </p>
                  <button
                    onClick={() => { setResult(null); setMode('text'); setProductName(result.productName); setProductBrand(result.productBrand); }}
                    className="mt-1.5 text-xs font-medium text-warning underline underline-offset-2"
                  >
                    전성분 직접 입력하기 →
                  </button>
                </div>
              </div>
            )}

            {/* ── BeautyLens 매칭 점수 ── */}
            {result.skinFit && (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-card overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                    result.skinFit.score >= 80 ? 'bg-green-50' :
                    result.skinFit.score >= 60 ? 'bg-primary/10' :
                    result.skinFit.score >= 40 ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <span className={`text-2xl font-black ${
                      result.skinFit.score >= 80 ? 'text-green-600' :
                      result.skinFit.score >= 60 ? 'text-primary' :
                      result.skinFit.score >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>{result.skinFit.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">내 피부 매칭 점수</span>
                    </div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      result.skinFit.score >= 80 ? 'bg-green-100 text-green-700' :
                      result.skinFit.score >= 60 ? 'bg-primary/15 text-primary' :
                      result.skinFit.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.skinFit.score >= 90 ? '퍼펙트 매치' :
                       result.skinFit.score >= 80 ? '최적' :
                       result.skinFit.score >= 60 ? '적합' :
                       result.skinFit.score >= 40 ? '보통' : '주의'}
                    </span>
                  </div>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-full bg-neutral-100 rounded-full h-2.5 mb-3">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      result.skinFit.score >= 80 ? 'bg-green-500' :
                      result.skinFit.score >= 60 ? 'bg-primary' :
                      result.skinFit.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.skinFit.score}%` }}
                  />
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{result.skinFit.reason}</p>

                {result.skinFit.warnings.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1">
                    {result.skinFit.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-amber-700">{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 프로필 미설정 → 매칭 점수 유도 */}
            {!result.skinFit && (
              <button
                onClick={() => navigate('/profile')}
                className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-left flex items-center gap-3"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">매칭 점수 확인하기</p>
                  <p className="text-xs text-muted-foreground mt-0.5">프로필을 설정하면 이 제품과 내 피부의 궁합을 점수로 알려드려요</p>
                </div>
              </button>
            )}

            {/* Overall grade */}
            <div className={`rounded-xl border p-4 shadow-card ${
              result.overallGrade === 'good' ? 'border-success/30 bg-success/5' :
              result.overallGrade === 'bad' ? 'border-danger/30 bg-danger/5' :
              'border-warning/30 bg-warning/5'
            }`}>
              <div className="flex items-center gap-2">
                {result.overallGrade === 'good' ? (
                  <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${result.overallGrade === 'bad' ? 'text-danger' : 'text-warning'}`} />
                )}
                <span className={`text-sm font-bold ${
                  result.overallGrade === 'good' ? 'text-success' :
                  result.overallGrade === 'bad' ? 'text-danger' : 'text-warning'
                }`}>
                  {result.overallGrade === 'good' ? '안전한 제품' : result.overallGrade === 'bad' ? '주의 필요' : '보통 수준'}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{result.summary}</p>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-success font-medium">안전 {safeCount}</span>
                <span className="text-warning font-medium">주의 {cautionCount}</span>
                <span className="text-danger font-medium">위험 {dangerCount}</span>
              </div>

              {/* 신뢰도 지표 — 분석 근거의 투명성 */}
              {typeof result.confidence === 'number' && (
                <div className="mt-3 rounded-lg bg-white/80 border border-border/60 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">분석 신뢰도</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        result.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        result.confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {result.confidence}%
                      </span>
                    </div>
                    {typeof result.ingredientCount === 'number' && result.ingredientCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">성분 {result.ingredientCount}개 분석</span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      result.confidence >= 80 ? 'bg-emerald-500' :
                      result.confidence >= 60 ? 'bg-amber-500' : 'bg-neutral-400'
                    }`} style={{ width: `${result.confidence}%` }} />
                  </div>
                  {result.confidenceReason && (
                    <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{result.confidenceReason}</p>
                  )}
                </div>
              )}
            </div>

            {/* Allergy warning */}
            {allergyMatches.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs font-semibold text-danger">⚠️ 알레르기 성분 감지</p>
                <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name).join(', ')}</p>
              </div>
            )}

            {/* Key ingredients */}
            {result.keyIngredients && result.keyIngredients.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-1.5 mb-3">
                  <Star className="h-4 w-4 text-warning fill-current" />
                  <h2 className="text-sm font-bold text-foreground">핵심 성분</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.keyIngredients.map((ki, idx) => (
                    <div key={idx} className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2">
                      <p className="text-xs font-semibold text-primary">{ki.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ki.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredient interactions */}
            {result.interactions && result.interactions.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap className="h-4 w-4 text-warning" />
                  <h2 className="text-sm font-bold text-foreground">성분 상호작용</h2>
                </div>
                <div className="space-y-2.5">
                  {result.interactions.map((interaction, idx) => {
                    const isConflict = interaction.type === 'conflict';
                    const isSynergy = interaction.type === 'synergy';
                    const severityBg = isConflict
                      ? interaction.severity === 'high' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5'
                      : isSynergy ? 'border-success/30 bg-success/5' : 'border-warning/20 bg-warning/5';
                    const icon = isConflict ? '⚡' : isSynergy ? '✨' : '⚠️';
                    const typeLabel = isConflict ? '충돌' : isSynergy ? '시너지' : '주의';
                    const typeColor = isConflict ? 'text-danger' : isSynergy ? 'text-success' : 'text-warning';
                    return (
                      <div key={idx} className={`rounded-xl border p-3 ${severityBg}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs">{icon}</span>
                          <span className={`text-xs font-bold ${typeColor}`}>{typeLabel}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-medium text-foreground">{interaction.ingredient_a}</span>
                          <span className="text-xs text-muted-foreground">+</span>
                          <span className="text-xs font-medium text-foreground">{interaction.ingredient_b}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{interaction.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ingredients list */}
            <div>
              <h2 className="mb-3 text-base font-bold text-foreground">전성분 분석 결과</h2>

              {/* AI 면책 고지 */}
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
                ⚠️ AI가 제공하는 참고 정보입니다. 의학적 진단 또는 처방을 대체하지 않으며, 민감성 피부 또는 알레르기가 있는 경우 전문가와 상담하시기 바랍니다.
              </div>

              <div className="space-y-2">
                {result.ingredients.map((ingredient, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{ingredient.name}</p>
                          {ingredient.function && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{ingredient.function}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{ingredient.name_en}</p>
                        {/* 자극도/모공 수치 */}
                        {(ingredient.irritancy !== undefined || ingredient.comedogenicity !== undefined) && (
                          <div className="flex gap-3 mt-1">
                            {ingredient.irritancy !== undefined && (
                              <span className={`text-xs font-medium ${ingredient.irritancy >= 3 ? 'text-danger' : ingredient.irritancy >= 1 ? 'text-warning' : 'text-muted-foreground'}`}>
                                자극 {ingredient.irritancy}/5
                              </span>
                            )}
                            {ingredient.comedogenicity !== undefined && (
                              <span className={`text-xs font-medium ${ingredient.comedogenicity >= 3 ? 'text-danger' : ingredient.comedogenicity >= 1 ? 'text-warning' : 'text-muted-foreground'}`}>
                                모공 {ingredient.comedogenicity}/5
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <SafetyBadge safety={ingredient.safety} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ingredient.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyze another */}
            <Button
              onClick={() => { setResult(null); setIngredientsText(''); setProductName(''); setProductBrand(''); setUrlInput(''); }}
              variant="outline"
              className="w-full rounded-xl h-12"
            >
              다른 제품 분석하기
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full rounded-xl h-12 gap-2"
            >
              {copied ? <><Check className="h-4 w-4 text-success" />복사 완료</> : <><Share2 className="h-4 w-4" />결과 공유하기</>}
            </Button>
            <Button
              onClick={() => {
                const grade = result.overallGrade;
                const params = new URLSearchParams({
                  title: `${result.productName} 성분 분석 결과`,
                  body: result.summary,
                  product_name: result.productName,
                  product_brand: result.productBrand,
                  overall_grade: grade,
                });
                navigate(`/community?${params.toString()}`);
              }}
              variant="outline"
              className="w-full rounded-xl h-12 gap-2 border-primary/40 text-primary"
            >
              <Users className="h-4 w-4" />커뮤니티에 공유하기
            </Button>

            {/* 분석 결과 도움 피드백 */}
            <AnalysisFeedback />

            {/* 검색 출처 */}
            {result.searchSources && result.searchSources.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">참고 출처 (Google Search)</p>
                <div className="space-y-1">
                  {result.searchSources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary truncate hover:underline"
                    >
                      <Search className="h-2.5 w-2.5 shrink-0" />
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default IngredientAnalysis;
