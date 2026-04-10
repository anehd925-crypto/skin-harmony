import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import SafetyBadge from '@/components/SafetyBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Search, FlaskConical, ShieldCheck, AlertTriangle, Loader2, Link2, ClipboardPaste } from 'lucide-react';

interface AnalyzedIngredient {
  name: string;
  name_en: string;
  safety: 'safe' | 'caution' | 'danger';
  description: string;
}

interface AnalysisResult {
  productName: string;
  productBrand: string;
  ingredients: AnalyzedIngredient[];
  overallGrade: 'good' | 'moderate' | 'bad';
  summary: string;
}

const IngredientAnalysis = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [mode, setMode] = useState<'url' | 'text'>('text');
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!ingredientsText.trim()) {
      setError('전성분 목록을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-ingredients', {
        body: { ingredientsText, productName, productBrand },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pb-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/80">
          <ChevronLeft className="h-4 w-4" />뒤로
        </button>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary-foreground" />
          <h1 className="text-lg font-bold text-primary-foreground">전성분 분석</h1>
        </div>
        <p className="mt-1 text-sm text-primary-foreground/80">
          올리브영 제품의 전성분을 붙여넣으면 AI가 분석해드려요
        </p>
      </div>

      <div className="px-5">
        {!result && (
          <div className="-mt-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2 rounded-xl bg-card p-1 border border-border shadow-sm">
              <button
                onClick={() => setMode('text')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <ClipboardPaste className="h-4 w-4" />
                전성분 붙여넣기
              </button>
              <button
                onClick={() => setMode('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Link2 className="h-4 w-4" />
                URL 입력 (준비중)
              </button>
            </div>

            {/* Product info */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground">제품 정보 (선택)</h3>
              <Input
                placeholder="제품명 (예: 라운드랩 자작나무 수분 크림)"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="rounded-lg"
              />
              <Input
                placeholder="브랜드 (예: 라운드랩)"
                value={productBrand}
                onChange={e => setProductBrand(e.target.value)}
                className="rounded-lg"
              />
            </div>

            {mode === 'text' ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-foreground">전성분 목록</h3>
                <p className="text-xs text-muted-foreground">
                  올리브영 상품 페이지 → 상품정보제공고시 → 전성분을 복사해서 붙여넣어주세요
                </p>
                <Textarea
                  placeholder="정제수, 글리세린, 부틸렌글라이콜, 나이아신아마이드, ..."
                  value={ingredientsText}
                  onChange={e => setIngredientsText(e.target.value)}
                  className="min-h-[150px] rounded-lg text-sm"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-foreground">올리브영 URL</h3>
                <p className="text-xs text-muted-foreground">
                  🚧 URL 자동 추출 기능은 준비 중입니다. 전성분 붙여넣기를 이용해주세요.
                </p>
                <Input
                  placeholder="https://www.oliveyoung.co.kr/goods/..."
                  disabled
                  className="rounded-lg"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

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
          </div>
        )}

        {result && (
          <div className="-mt-4 space-y-4">
            {/* Product header */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-base font-bold text-foreground">{result.productName}</h2>
              <p className="text-sm text-muted-foreground">{result.productBrand}</p>
            </div>

            {/* Overall grade */}
            <div className={`rounded-xl border p-4 shadow-sm ${
              result.overallGrade === 'good' ? 'border-success/30 bg-success/5' :
              result.overallGrade === 'bad' ? 'border-danger/30 bg-danger/5' :
              'border-warning/30 bg-warning/5'
            }`}>
              <div className="flex items-center gap-2">
                {result.overallGrade === 'good' ? (
                  <ShieldCheck className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className={`h-5 w-5 ${result.overallGrade === 'bad' ? 'text-danger' : 'text-warning'}`} />
                )}
                <span className="text-sm font-bold text-foreground">{result.summary}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="text-success font-medium">안전 {safeCount}</span>
                <span className="text-warning font-medium">주의 {cautionCount}</span>
                <span className="text-danger font-medium">위험 {dangerCount}</span>
              </div>
            </div>

            {/* Allergy warning */}
            {allergyMatches.length > 0 && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="text-xs font-semibold text-danger">⚠️ 알레르기 성분 감지</p>
                <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name).join(', ')}</p>
              </div>
            )}

            {/* Ingredients list */}
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

            {/* Analyze another */}
            <Button
              onClick={() => { setResult(null); setIngredientsText(''); setProductName(''); setProductBrand(''); }}
              variant="outline"
              className="w-full rounded-xl h-12"
            >
              다른 제품 분석하기
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default IngredientAnalysis;
