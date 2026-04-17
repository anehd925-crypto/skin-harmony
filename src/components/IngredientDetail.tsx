import { useState } from 'react';
import { X, Loader2, BookOpen, AlertTriangle, Sparkles } from 'lucide-react';
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
}

interface IngredientDetailProps {
  ingredientName: string;
  onClose: () => void;
}

const IngredientDetail = ({ ingredientName, onClose }: IngredientDetailProps) => {
  const [info, setInfo] = useState<IngredientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useState(() => {
    const fetchInfo = async () => {
      try {
        const { data } = await supabase.functions.invoke('product-search', {
          body: {
            ingredientLookup: true,
            query: ingredientName,
          },
        });
        if (data?.ingredient) {
          setInfo(data.ingredient as IngredientInfo);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  });

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
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{info.category}</span>
                  {info.ewgGrade && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ewgColor(info.ewgGrade)}`}>
                      EWG {info.ewgGrade}등급
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngredientDetail;
