import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import SafetyBadge from '@/components/SafetyBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FlaskConical, ShieldCheck, AlertTriangle, Loader2,
  Bell, BellOff, ChevronLeft, ExternalLink, Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyzedIngredient {
  name: string;
  name_en: string;
  safety: 'safe' | 'caution' | 'danger';
  description: string;
  irritancy?: number;
  comedogenicity?: number;
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

interface AnalysisResult {
  productName: string;
  productBrand: string;
  ingredients: AnalyzedIngredient[];
  overallGrade: 'good' | 'moderate' | 'bad';
  summary: string;
  productTags?: ProductTags;
  skinFit?: SkinFit;
  groundingUsed?: boolean;
  ingredientsFound?: boolean;
}

interface ScrapeResult {
  productName: string;
  productBrand: string;
  ingredientsText: string;
  price?: number;
  productUrl?: string;
  imageUrl?: string;
  source?: 'coupang' | 'oliveyoung';
  warning?: string;
  error?: string;
  goodsNo?: string;
  productId?: string;
}

type Stage = 'loading' | 'need_ingredients' | 'analyzing' | 'result' | 'error';

const ShareEntry = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUser();
  const { toast } = useToast();

  const sharedUrl = searchParams.get('url') || '';

  const [stage, setStage] = useState<Stage>('loading');
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(null);
  const [manualIngredients, setManualIngredients] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertRegistered, setAlertRegistered] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  // 진입 즉시 스크래핑 시작
  useEffect(() => {
    if (!sharedUrl) {
      setStage('error');
      setErrorMsg('URL 정보가 없습니다. 쿠팡 또는 올리브영에서 공유하기를 이용해주세요.');
      return;
    }
    runScrape(sharedUrl);
  }, [sharedUrl]);

  const runScrape = async (url: string) => {
    setStage('loading');
    try {
      const { data, error } = await supabase.functions.invoke('scrape-oliveyoung', {
        body: { url },
      });
      if (error) {
        let msg = error.message;
        try {
          const context = (error as { context?: Response }).context;
          if (context && typeof context.json === 'function') {
            const body = await context.clone().json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const scraped = data as ScrapeResult;
      setScrapeData(scraped);

      if (scraped.error && !scraped.productName && !scraped.goodsNo) {
        setErrorMsg(scraped.error);
        setStage('error');
        return;
      }

      // 상품명이 없으면 goodsNo / productId를 AI 힌트로 사용
      const effectiveName = scraped.productName
        || (scraped.goodsNo ? `올리브영 코스메틱 상품 코드 ${scraped.goodsNo}. 이 코드의 실제 상품명을 알면 그 성분을 분석하고, 모르면 올리브영 인기 스킨케어 제품의 일반적인 성분으로 분석해주세요.` : '')
        || (scraped.productId ? `쿠팡 상품 코드 ${scraped.productId}. 이 코드의 실제 상품명을 알면 그 성분을 분석하고, 모르면 일반적인 스킨케어 제품 성분으로 분석해주세요.` : '');

      if (!effectiveName && !scraped.ingredientsText) {
        setErrorMsg('상품 정보를 가져오지 못했습니다. 직접 전성분을 입력해주세요.');
        setStage('need_ingredients');
        return;
      }

      // 전성분 있든 없든 바로 분석 진행 (없으면 AI가 상품명으로 유사 성분 추정)
      await runAnalysis(scraped.ingredientsText || '', effectiveName, scraped.productBrand, scraped);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setStage('error');
    }
  };

  const runAnalysis = async (
    ingredientsText: string,
    productName: string,
    productBrand: string,
    scraped: ScrapeResult
  ) => {
    setStage('analyzing');
    try {
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
      } : null;

      const { data, error } = await supabase.functions.invoke('analyze-ingredients', {
        body: { ingredientsText, productName, productBrand, userProfile },
      });
      if (error) {
        let msg = error.message;
        try {
          const context = (error as { context?: Response }).context;
          if (context && typeof context.json === 'function') {
            const body = await context.clone().json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);
      setStage('result');

      // products 테이블에 AI 태깅과 함께 upsert (product_url 기준)
      const productUrl = scraped.productUrl || sharedUrl;
      if (productUrl) {
        const tags = analysisResult.productTags;
        await supabase.from('products').upsert({
          name: analysisResult.productName || productName || '이름 없음',
          brand: analysisResult.productBrand || productBrand || '',
          category: 'skincare',
          product_url: productUrl,
          image_url: scraped.imageUrl || '',
          price: scraped.price ?? null,
          source: scraped.source || '',
          ingredients_text: ingredientsText,
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
      }

      // 분석 기록 저장
      if (user) {
        await supabase.from('analysis_history').insert({
          user_id: user.id,
          product_name: analysisResult.productName || productName || '이름 없음',
          product_brand: analysisResult.productBrand || productBrand || '',
          ingredients_text: ingredientsText,
          result: analysisResult as unknown as Record<string, unknown>,
          overall_grade: analysisResult.overallGrade,
          product_url: scraped.productUrl || sharedUrl,
          image_url: scraped.imageUrl || '',
          price: scraped.price ?? null,
          source: scraped.source || '',
        });
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
      setStage('error');
    }
  };

  const handleManualAnalyze = () => {
    if (!manualIngredients.trim() || !scrapeData) return;
    runAnalysis(manualIngredients, scrapeData.productName, scrapeData.productBrand, scrapeData);
  };

  const handleRegisterAlert = async () => {
    if (!alertPrice || !scrapeData || !user) return;
    const targetPrice = parseInt(alertPrice.replace(/,/g, ''), 10);
    if (isNaN(targetPrice)) { toast({ title: '올바른 가격을 입력해주세요.' }); return; }

    setAlertLoading(true);
    const { error } = await supabase.from('price_alerts').insert({
      user_id: user.id,
      product_url: scrapeData.productUrl || sharedUrl,
      product_name: scrapeData.productName,
      product_brand: scrapeData.productBrand,
      image_url: scrapeData.imageUrl || '',
      source: scrapeData.source || 'coupang',
      current_price: scrapeData.price ?? null,
      target_price: targetPrice,
    });
    setAlertLoading(false);

    if (error) { toast({ title: '등록 실패', description: error.message }); return; }
    setAlertRegistered(true);
    toast({ title: '가격 알림 등록 완료', description: `${targetPrice.toLocaleString()}원 이하가 되면 알려드릴게요` });
  };

  const allergyMatches = result?.ingredients.filter(i =>
    profile.allergies.some(a => i.name.includes(a) || i.name_en?.toLowerCase().includes(a.toLowerCase()))
  ) ?? [];

  const safeCount = result?.ingredients.filter(i => i.safety === 'safe').length ?? 0;
  const cautionCount = result?.ingredients.filter(i => i.safety === 'caution').length ?? 0;
  const dangerCount = result?.ingredients.filter(i => i.safety === 'danger').length ?? 0;

  const sourceLabel = scrapeData?.source === 'coupang' ? '쿠팡' : '올리브영';

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* 헤더 */}
      <div className="gradient-primary px-4 pb-6 pt-12">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/80">
          <ChevronLeft className="h-4 w-4" />홈으로
        </button>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary-foreground" />
          <h1 className="text-lg font-bold text-primary-foreground">공유된 제품 분석</h1>
        </div>
        {scrapeData?.source && (
          <p className="mt-1 text-sm text-primary-foreground/80">{sourceLabel}에서 공유된 제품을 분석하고 있어요</p>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4">

        {/* 로딩: 스크래핑 중 */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">제품 정보를 가져오는 중...</p>
            <p className="text-xs text-muted-foreground text-center">{sharedUrl.substring(0, 50)}...</p>
          </div>
        )}

        {/* 로딩: 분석 중 */}
        {stage === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">AI가 전성분을 분석하는 중...</p>
            {scrapeData?.productName && (
              <p className="text-xs text-muted-foreground">{scrapeData.productName}</p>
            )}
          </div>
        )}

        {/* 전성분 수동 입력 */}
        {stage === 'need_ingredients' && scrapeData && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-bold text-foreground">{scrapeData.productName || '제품명 없음'}</p>
              {scrapeData.productBrand && <p className="text-xs text-muted-foreground">{scrapeData.productBrand}</p>}
              {scrapeData.warning && <p className="mt-2 text-xs text-warning">{scrapeData.warning}</p>}
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground">전성분을 직접 붙여넣어 주세요</h3>
              <p className="text-xs text-muted-foreground">
                {sourceLabel} 상품 페이지 → 상품 정보 → 전성분 복사 후 붙여넣기
              </p>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="정제수, 글리세린, 부틸렌글라이콜, ..."
                value={manualIngredients}
                onChange={e => setManualIngredients(e.target.value)}
              />
              <Button
                onClick={handleManualAnalyze}
                disabled={!manualIngredients.trim()}
                className="w-full rounded-xl h-11"
              >
                성분 분석하기
              </Button>
            </div>
          </div>
        )}

        {/* 오류 */}
        {stage === 'error' && (
          <div className="space-y-4 py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
            <p className="text-sm font-semibold text-foreground">제품 정보를 가져오지 못했습니다</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate('/analyze')} variant="outline" className="rounded-xl">
              직접 전성분 입력하기
            </Button>
          </div>
        )}

        {/* 분석 결과 */}
        {stage === 'result' && result && (
          <div className="space-y-4">
            {/* 제품 정보 카드 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground">{result.productName}</p>
                  <p className="text-sm text-muted-foreground">{result.productBrand}</p>
                  {scrapeData?.price && (
                    <p className="mt-1 text-sm font-semibold text-primary">
                      현재가 {scrapeData.price.toLocaleString()}원
                    </p>
                  )}
                </div>
                {scrapeData?.productUrl && (
                  <a href={scrapeData.productUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />{sourceLabel}
                  </a>
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
                    실제 전성분을 찾지 못해 유사 성분으로 추정했습니다. 정확한 분석은 전성분 직접 입력을 이용해 주세요.
                  </p>
                </div>
              </div>
            )}

            {/* 종합 등급 */}
            <div className={`rounded-xl border p-4 shadow-sm ${
              result.overallGrade === 'good' ? 'border-success/30 bg-success/5' :
              result.overallGrade === 'bad' ? 'border-danger/30 bg-danger/5' :
              'border-warning/30 bg-warning/5'
            }`}>
              <div className="flex items-center gap-2">
                {result.overallGrade === 'good'
                  ? <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                  : <AlertTriangle className={`h-5 w-5 shrink-0 ${result.overallGrade === 'bad' ? 'text-danger' : 'text-warning'}`} />}
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
            </div>

            {/* 알레르기 경고 */}
            {allergyMatches.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs font-semibold text-danger">⚠️ 내 알레르기 성분 감지</p>
                <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name).join(', ')}</p>
              </div>
            )}

            {/* 내 피부 적합도 */}
            {result.skinFit && (
              <div className={`rounded-xl border p-4 shadow-sm ${
                result.skinFit.label === '최적' ? 'border-success/40 bg-success/5' :
                result.skinFit.label === '적합' ? 'border-primary/30 bg-primary/5' :
                result.skinFit.label === '보통' ? 'border-warning/30 bg-warning/5' :
                'border-danger/30 bg-danger/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">내 피부 적합도</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      result.skinFit.label === '최적' ? 'text-success' :
                      result.skinFit.label === '적합' ? 'text-primary' :
                      result.skinFit.label === '보통' ? 'text-warning' : 'text-danger'
                    }`}>{result.skinFit.score}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      result.skinFit.label === '최적' ? 'bg-success/20 text-success' :
                      result.skinFit.label === '적합' ? 'bg-primary/20 text-primary' :
                      result.skinFit.label === '보통' ? 'bg-warning/20 text-warning' :
                      'bg-danger/20 text-danger'
                    }`}>{result.skinFit.label}</span>
                  </div>
                </div>
                <div className="w-full rounded-full bg-muted h-1.5 mb-2">
                  <div className={`h-1.5 rounded-full ${
                    result.skinFit.label === '최적' ? 'bg-success' :
                    result.skinFit.label === '적합' ? 'bg-primary' :
                    result.skinFit.label === '보통' ? 'bg-warning' : 'bg-danger'
                  }`} style={{ width: `${result.skinFit.score}%` }} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.skinFit.reason}</p>
                {result.skinFit.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.skinFit.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                        <p className="text-xs text-warning">{w}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 가격 알림 등록 */}
            {scrapeData?.price && !alertRegistered && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">가격 알림 등록</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  현재 {scrapeData.price.toLocaleString()}원 · 원하는 가격이 되면 알려드려요
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="목표 가격 입력 (원)"
                    value={alertPrice}
                    onChange={e => setAlertPrice(e.target.value)}
                    className="rounded-lg"
                  />
                  <Button
                    onClick={handleRegisterAlert}
                    disabled={alertLoading || !alertPrice || !user}
                    className="shrink-0 rounded-lg"
                  >
                    {alertLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록'}
                  </Button>
                </div>
                {!user && <p className="text-xs text-muted-foreground">로그인 후 이용 가능해요</p>}
              </div>
            )}

            {alertRegistered && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-success" />
                <p className="text-xs font-semibold text-success">가격 알림이 등록됐습니다</p>
              </div>
            )}

            {/* 성분 목록 */}
            <div>
              <h2 className="mb-3 text-base font-bold text-foreground">전성분 분석 결과</h2>
              <div className="space-y-2">
                {result.ingredients.map((ingredient, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{ingredient.name}</p>
                        <p className="text-xs text-muted-foreground">{ingredient.name_en}</p>
                      </div>
                      <SafetyBadge safety={ingredient.safety} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ingredient.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate('/history')} variant="outline" className="flex-1 rounded-xl h-11">
                분석 기록 보기
              </Button>
              <Button onClick={() => navigate('/')} className="flex-1 rounded-xl h-11">
                홈으로
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareEntry;
