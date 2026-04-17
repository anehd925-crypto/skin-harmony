import { useState, useEffect } from 'react';
import { X, Loader2, BookOpen, AlertTriangle, Sparkles, ExternalLink, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface IngredientInfo {
  name: string;
  nameEn: string;
  category: string;
  description: string;
  benefits: string[];
  risks: string[];
  ewgGrade: string;
  suitableFor: string;
  avoidFor: string;
  similar?: Array<{ name: string; reason: string }>;
  sources?: Array<{ title: string; url: string }>;
}

// EWG 등급 라벨
const EWG_LABELS: Record<string, { label: string; color: string }> = {
  '1': { label: '낮은 위험', color: 'text-green-700' },
  '2': { label: '낮은 위험', color: 'text-green-700' },
  '3': { label: '보통 위험', color: 'text-amber-700' },
  '4': { label: '보통 위험', color: 'text-amber-700' },
  '5': { label: '중간 위험', color: 'text-amber-700' },
  '6': { label: '중간 위험', color: 'text-amber-700' },
  '7': { label: '높은 위험', color: 'text-red-700' },
  '8': { label: '높은 위험', color: 'text-red-700' },
  '9': { label: '매우 높은 위험', color: 'text-red-700' },
  '10': { label: '매우 높은 위험', color: 'text-red-700' },
};

interface IngredientDetailProps {
  ingredientName: string;
  onClose: () => void;
}

const IngredientDetail = ({ ingredientName, onClose }: IngredientDetailProps) => {
  const [info, setInfo] = useState<IngredientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchInfo = async () => {
      try {
        const { data } = await supabase.functions.invoke('product-search', {
          body: {
            ingredientLookup: true,
            query: ingredientName,
          },
        });
        if (cancelled) return;
        if (data?.ingredient) {
          setInfo(data.ingredient as IngredientInfo);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchInfo();
    return () => { cancelled = true; };
  }, [ingredientName]);

  const ewgColor = (grade: string) => {
    const n = parseInt(grade);
    if (n <= 2) return 'text-green-600 bg-green-50 border-green-200';
    if (n <= 6) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-h-[85vh] rounded-t-3xl bg-white overflow-y-auto safe-bottom animate-in slide-in-from-bottom duration-300">

        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">성분 사전</span>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">"{ingredientName}" 정보를 찾는 중...</p>
            </div>
          ) : error || !info ? (
            <div className="py-10 text-center">
              <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">성분 정보를 불러오지 못했어요</p>
              <button onClick={onClose} className="mt-3 text-xs text-primary font-semibold">닫기</button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-foreground">{info.name}</h2>
                {info.nameEn && <p className="text-xs text-muted-foreground mt-0.5">{info.nameEn}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{info.category}</span>
                  {info.ewgGrade && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ewgColor(info.ewgGrade)}`}>
                      EWG {info.ewgGrade}등급
                      {EWG_LABELS[info.ewgGrade]?.label && (
                        <span className="ml-1 opacity-80">· {EWG_LABELS[info.ewgGrade].label}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-foreground leading-relaxed">{info.description}</p>

              {info.benefits?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-600 mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> 효능
                  </p>
                  <ul className="space-y-1">
                    {info.benefits.map((b, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">+</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {info.risks?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-500 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> 주의사항
                  </p>
                  <ul className="space-y-1">
                    {info.risks.map((r, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">-</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {info.suitableFor && (
                  <div className="rounded-xl bg-green-50 px-3 py-2.5">
                    <p className="text-xs font-semibold text-green-700 mb-1">추천 피부</p>
                    <p className="text-xs text-green-600">{info.suitableFor}</p>
                  </div>
                )}
                {info.avoidFor && (
                  <div className="rounded-xl bg-red-50 px-3 py-2.5">
                    <p className="text-xs font-semibold text-red-600 mb-1">주의 피부</p>
                    <p className="text-xs text-red-500">{info.avoidFor}</p>
                  </div>
                )}
              </div>

              {/* 유사 성분군 */}
              {info.similar && info.similar.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                    <Leaf className="h-3 w-3 text-emerald-600" /> 비슷한 역할의 성분
                  </p>
                  <ul className="space-y-1.5">
                    {info.similar.slice(0, 4).map((s, i) => (
                      <li key={i} className="text-xs text-foreground">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-muted-foreground"> — {s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 출처 및 참고 링크 */}
              <div className="rounded-xl border border-border bg-neutral-50 p-3">
                <p className="text-xs font-bold text-muted-foreground mb-2">참고 자료</p>
                <div className="space-y-1.5">
                  {info.sources?.slice(0, 3).map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" />{s.title}
                    </a>
                  ))}
                  {/* EWG 공식 DB 기본 링크 */}
                  <a
                    href={`https://www.ewg.org/skindeep/search/?search=${encodeURIComponent(info.nameEn || info.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />EWG Skin Deep에서 보기
                  </a>
                  <a
                    href={`https://www.hwahae.co.kr/search?q=${encodeURIComponent(info.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />화해에서 보기
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngredientDetail;
