import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Camera, Link2, PenLine, ChevronRight, ScanLine,
  Search, X, Clock, FlaskConical, Loader2, Package, GitCompare, BellPlus, Check,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { registerDiscountAlert } from '@/utils/discountAlert';
import { useToast } from '@/hooks/use-toast';

interface HistoryItem {
  id: string;
  product_name: string;
  product_brand: string;
  overall_grade: string;
  created_at: string;
}

interface SearchSuggestion {
  name: string;
  brand: string;
  category: string;
  note: string;
}

const gradeColor: Record<string, string> = {
  good:     'text-emerald-600 bg-emerald-50 border-emerald-200',
  moderate: 'text-amber-600  bg-amber-50  border-amber-200',
  bad:      'text-red-600    bg-red-50    border-red-200',
};
const gradeLabel: Record<string, string> = { good: '안전', moderate: '보통', bad: '주의' };

const ScanHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [alertingKey, setAlertingKey] = useState<string | null>(null);
  const [alertedKeys, setAlertedKeys] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setHistoryLoading(false); return; }
    supabase
      .from('analysis_history')
      .select('id, product_name, product_brand, overall_grade, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setRecentHistory((data ?? []) as HistoryItem[]);
        setHistoryLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await supabase.functions.invoke('product-search', { body: { query: q } });
        setSuggestions((data?.suggestions ?? []) as SearchSuggestion[]);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSelectProduct = (s: SearchSuggestion) => {
    navigate('/analyze', { state: { initialMode: 'product', productName: s.name, productBrand: s.brand } });
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    navigate('/analyze', { state: { initialMode: 'product', productName: searchQuery.trim() } });
  };

  const handleAddAlert = async (e: React.MouseEvent, s: SearchSuggestion) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast({ title: '로그인이 필요합니다', description: '할인 알림을 받으려면 로그인해 주세요.' });
      navigate('/auth');
      return;
    }
    const key = `${s.brand}::${s.name}`;
    if (alertedKeys.has(key) || alertingKey === key) return;
    setAlertingKey(key);
    try {
      const result = await registerDiscountAlert({
        userId: user.id,
        name: s.name,
        brand: s.brand,
        category: 'skincare',
      });
      if (result.ok) {
        setAlertedKeys(prev => new Set(prev).add(key));
        toast({
          title: result.reason === 'already_registered' ? '이미 등록된 알림이에요' : '할인 알림을 등록했어요',
          description: '가격이 내려가면 푸시로 알려드릴게요.',
        });
      } else {
        toast({
          title: '알림 등록 실패',
          description: result.message ?? '잠시 후 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    } finally {
      setAlertingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* ── 헤더 ── */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 pt-safe">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-base font-bold text-foreground">성분 분석</h1>
        </div>

        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
            placeholder="제품명 또는 브랜드로 검색..."
            className="w-full rounded-2xl border border-border bg-background pl-10 pr-10 py-3 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* 드롭다운 */}
          {searchQuery && searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              {searchLoading ? (
                <div className="flex items-center gap-2 px-4 py-3.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  AI가 제품을 찾고 있어요...
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  {suggestions.map((s, i) => {
                    const key = `${s.brand}::${s.name}`;
                    const alerted = alertedKeys.has(key);
                    const alerting = alertingKey === key;
                    return (
                      <div
                        key={i}
                        className="flex w-full items-center gap-2 border-b border-border last:border-b-0 px-3 py-2.5 hover:bg-muted transition-colors"
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectProduct(s)}
                          className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                        >
                          <FlaskConical className="h-4 w-4 shrink-0 text-primary/50" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.brand}{s.note ? ` · ${s.note}` : ''}</p>
                          </div>
                        </button>

                        {/* 작은 알림 아이콘 — 클릭 시 할인 알림 등록 */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleAddAlert(e, s)}
                          disabled={alerted || alerting}
                          aria-label={alerted ? '알림 등록됨' : '할인 알림 추가'}
                          title={alerted ? '알림이 등록되어 있어요' : '가격 인하 시 푸시 알림을 받습니다'}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            alerted
                              ? 'bg-green-50 text-green-600'
                              : 'text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50'
                          }`}
                        >
                          {alerting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : alerted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <BellPlus className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={handleSearchSubmit}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Search className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold text-primary">"{searchQuery}" 직접 분석하기</p>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSearchSubmit}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted transition-colors"
                >
                  <Search className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">"{searchQuery}" 분석하기</p>
                    <p className="text-xs text-muted-foreground">AI가 성분을 찾아 분석합니다</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* ── 입력 방법 카드 ── */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">분석 방법 선택</p>
          <div className="space-y-2.5">

            {/* 성분표 스캔 */}
            <button
              onClick={() => navigate('/scan-ocr')}
              className="flex w-full items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
                <Camera className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">성분표 스캔</p>
                <p className="text-xs text-muted-foreground mt-0.5">제품 뒷면 전성분표 촬영 → 즉시 분석</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* 제품 촬영 → 보관함 */}
            <button
              onClick={() => navigate('/scan-ocr', { state: { scanMode: 'product' } })}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">제품 촬영 → 보관함 추가</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI가 제품명·카테고리 자동 인식</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* AI 제품 비교 */}
            <button
              onClick={() => navigate('/compare-ai')}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <GitCompare className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">두 제품 비교</p>
                <p className="text-xs text-muted-foreground mt-0.5">내 피부에 더 맞는 제품을 AI가 추천</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* URL */}
            <button
              onClick={() => navigate('/analyze', { state: { initialMode: 'url' } })}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Link2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">URL로 분석</p>
                <p className="text-xs text-muted-foreground mt-0.5">올리브영·쿠팡 제품 링크 붙여넣기</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* 직접 입력 */}
            <button
              onClick={() => navigate('/analyze', { state: { initialMode: 'text' } })}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <PenLine className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">직접 입력</p>
                <p className="text-xs text-muted-foreground mt-0.5">성분표 텍스트를 직접 입력</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </section>

        {/* ── 최근 분석 기록 (하단) ── */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">최근 분석</span>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="flex items-center gap-0.5 text-xs text-primary font-medium"
              >
                전체 보기<ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-neutral-200 animate-pulse" />)}
              </div>
            ) : recentHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-5 text-center">
                <p className="text-xs text-muted-foreground">아직 분석 기록이 없어요</p>
                <p className="text-xs text-muted-foreground mt-0.5">위에서 제품을 검색하거나 촬영해보세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentHistory.map(h => {
                  const grade = h.overall_grade as 'good' | 'moderate' | 'bad';
                  const d = new Date(h.created_at);
                  return (
                    <button
                      key={h.id}
                      onClick={() => navigate('/history')}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
                    >
                      <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{h.product_name || '이름 없는 제품'}</p>
                        {h.product_brand && <p className="text-xs text-muted-foreground truncate">{h.product_brand}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeColor[grade] ?? gradeColor.moderate}`}>
                          {gradeLabel[grade] ?? '보통'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.getMonth() + 1}/{d.getDate()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center pb-2">
          💡 AI 기반 참고 정보이며 의학적 진단을 대체하지 않습니다
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanHub;
