import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Search, Loader2, RotateCcw, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';

interface ProductInput { name: string; brand: string; }
interface ComparePoint { aspect: string; a: string; b: string; winner: 'A' | 'B' | 'tie'; }
interface ProductResult {
  name: string; brand: string;
  mainIngredients: string[];
  pros: string[];
  cons: string[];
  suitableFor: string;
  score: number;
}
interface CompareResult {
  winner: 'A' | 'B' | 'tie';
  winnerReason: string;
  productA: ProductResult;
  productB: ProductResult;
  comparisonPoints: ComparePoint[];
  caution: string;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-500';
};

const WINNER_BG = (winner: 'A' | 'B' | 'tie', mine: 'A' | 'B') => {
  if (winner === 'tie') return 'border-border bg-background';
  return winner === mine ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-background';
};

const ProductCompare = () => {
  const navigate = useNavigate();
  const { profile } = useUser();

  const [productA, setProductA] = useState<ProductInput>({ name: '', brand: '' });
  const [productB, setProductB] = useState<ProductInput>({ name: '', brand: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const canCompare = productA.name.trim().length > 0 && productB.name.trim().length > 0;

  const handleCompare = async () => {
    if (!canCompare) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const userProfile = profile
        ? {
            skinType: profile.skinType,
            skinConcerns: profile.skinConcerns,
            skinSensitivity: profile.skinSensitivity,
            ageGroup: profile.ageGroup,
            avoidIngredients: profile.avoidIngredients,
          }
        : null;

      const { data, error: fnErr } = await supabase.functions.invoke('compare-products', {
        body: { productA, productB, userProfile },
      });

      if (fnErr || !data?.productA) {
        setError('비교 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      setResult(data as CompareResult);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProductA({ name: '', brand: '' });
    setProductB({ name: '', brand: '' });
    setResult(null);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">AI 제품 비교</h1>
          <p className="text-xs text-muted-foreground">내 피부에 더 맞는 제품을 찾아드려요</p>
        </div>
        {result && (
          <button onClick={handleReset} className="flex h-8 items-center gap-1 px-3 rounded-full border border-border text-xs text-muted-foreground hover:bg-muted">
            <RotateCcw className="h-3 w-3" />새 비교
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">

        {/* 제품 입력 */}
        {!result && (
          <>
            {/* 안내 */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-bold text-foreground mb-1">비교할 제품 두 가지를 입력하세요</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                내 피부 프로필을 바탕으로 AI가 어떤 제품이 더 잘 맞는지 성분·특성을 분석해 알려드려요.
              </p>
            </div>

            {/* 제품 A */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">A</span>
                <p className="text-sm font-bold text-foreground">첫 번째 제품</p>
              </div>
              <input
                value={productA.name}
                onChange={e => setProductA(p => ({ ...p, name: e.target.value }))}
                placeholder="제품명 입력 (예: 시카페어 크림)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
              />
              <input
                value={productA.brand}
                onChange={e => setProductA(p => ({ ...p, brand: e.target.value }))}
                placeholder="브랜드명 (선택)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors text-muted-foreground"
              />
            </div>

            {/* VS 구분 */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm font-black text-muted-foreground">VS</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 제품 B */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-white">B</span>
                <p className="text-sm font-bold text-foreground">두 번째 제품</p>
              </div>
              <input
                value={productB.name}
                onChange={e => setProductB(p => ({ ...p, name: e.target.value }))}
                placeholder="제품명 입력 (예: 선스틱 워터풀)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
              />
              <input
                value={productB.brand}
                onChange={e => setProductB(p => ({ ...p, brand: e.target.value }))}
                placeholder="브랜드명 (선택)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors text-muted-foreground"
              />
            </div>

            {/* 오류 */}
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 text-base font-bold"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI가 비교 중...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />AI 비교 분석하기</>
              )}
            </Button>
          </>
        )}

        {/* 결과 */}
        {result && (
          <div ref={resultRef} className="space-y-4">

            {/* 추천 제품 배너 */}
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-primary" />
                <p className="text-sm font-bold text-foreground">
                  {result.winner === 'tie'
                    ? '두 제품이 비슷해요'
                    : `제품 ${result.winner}이 더 적합해요`}
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.winnerReason}</p>
              {result.caution && (
                <p className="mt-2 text-xs text-muted-foreground">⚠️ {result.caution}</p>
              )}
            </div>

            {/* 스코어 비교 */}
            <div className="grid grid-cols-2 gap-3">
              {(['A', 'B'] as const).map(side => {
                const p = side === 'A' ? result.productA : result.productB;
                const isWinner = result.winner === side;
                return (
                  <div key={side} className={`rounded-2xl border p-4 relative ${WINNER_BG(result.winner, side)}`}>
                    {isWinner && result.winner !== 'tie' && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow">
                        <Trophy className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${side === 'A' ? 'bg-primary/10 text-primary' : 'bg-muted text-neutral-700'}`}>
                      {side}
                    </span>
                    <p className="mt-2 text-sm font-bold text-foreground line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                    <p className={`mt-2 text-2xl font-black ${SCORE_COLOR(p.score)}`}>{p.score}<span className="text-sm font-normal">/100</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">AI 적합도 점수</p>
                  </div>
                );
              })}
            </div>

            {/* 항목별 비교 */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-foreground">항목별 비교</p>
              </div>
              <div className="divide-y divide-border">
                {result.comparisonPoints.map((cp, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-foreground">{cp.aspect}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        cp.winner === 'tie'
                          ? 'bg-muted text-neutral-600'
                          : cp.winner === 'A'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-neutral-700 text-white'
                      }`}>
                        {cp.winner === 'tie' ? '동일' : `${cp.winner} 우세`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p><span className="font-semibold text-primary">A</span> {cp.a}</p>
                      <p><span className="font-semibold text-neutral-700">B</span> {cp.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 제품별 장단점 */}
            {(['A', 'B'] as const).map(side => {
              const p = side === 'A' ? result.productA : result.productB;
              return (
                <div key={side} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${side === 'A' ? 'bg-primary/10 text-primary' : 'bg-muted text-neutral-700'}`}>{side}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                    </div>
                  </div>

                  {p.mainIngredients?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-1.5">주요 성분</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.mainIngredients.map((ing, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-muted text-neutral-700 rounded-full">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-bold text-green-600 mb-1.5">✓ 장점</p>
                      <ul className="space-y-1">
                        {p.pros?.map((pro, i) => <li key={i} className="text-xs text-muted-foreground">• {pro}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-500 mb-1.5">✗ 단점</p>
                      <ul className="space-y-1">
                        {p.cons?.map((con, i) => <li key={i} className="text-xs text-muted-foreground">• {con}</li>)}
                      </ul>
                    </div>
                  </div>

                  {p.suitableFor && (
                    <div className="rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground">
                      💡 {p.suitableFor}
                    </div>
                  )}
                </div>
              );
            })}

            <Button variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RotateCcw className="h-3.5 w-3.5 mr-2" />다른 제품 비교하기
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductCompare;
