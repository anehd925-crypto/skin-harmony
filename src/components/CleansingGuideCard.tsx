import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { Droplets, ChevronRight, Loader2, Sparkles, ShieldAlert } from 'lucide-react';

interface CleansingStep {
  title: string;
  detail: string;
  frequency?: string;
}
interface CleansingProduct {
  name: string;
  brand: string;
  category: string;
  reason: string;
}
interface CleansingGuide {
  overview: string;
  steps: CleansingStep[];
  avoid: string[];
  products: CleansingProduct[];
}

const CleansingGuideCard = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [open, setOpen] = useState(false);

  const skinType = profile.skinType;

  const { data, isLoading, isError, refetch } = useQuery<CleansingGuide | null>({
    queryKey: ['cleansing_guide', skinType, profile.skinSensitivity, profile.ageGroup],
    queryFn: async () => {
      if (!skinType) return null;
      const { data: result, error } = await supabase.functions.invoke('skin-coach', {
        body: {
          mode: 'cleansing',
          userProfile: {
            skinType: profile.skinType,
            skinConcerns: profile.skinConcerns,
            skinSensitivity: profile.skinSensitivity,
            ageGroup: profile.ageGroup,
            avoidIngredients: profile.avoidIngredients,
            skinGoals: profile.skinGoals,
          },
        },
      });
      if (error) throw error;
      return (result ?? null) as CleansingGuide | null;
    },
    enabled: open && !!skinType,
    staleTime: 1000 * 60 * 60 * 24, // 24시간 캐시
  });

  if (!skinType) {
    return (
      <button
        onClick={() => navigate('/onboarding')}
        className="flex w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100">
          <Droplets className="h-4 w-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-800">피부 타입별 클렌징 가이드</p>
          <p className="text-xs text-sky-600 mt-0.5">먼저 피부 타입을 설정해주세요</p>
        </div>
        <ChevronRight className="h-4 w-4 text-sky-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100">
          <Droplets className="h-4 w-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-800">{skinType} 피부 클렌징 가이드</p>
          <p className="text-xs text-sky-600 mt-0.5">방법과 추천 제품을 AI가 제안해요</p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
        ) : (
          <ChevronRight className={`h-4 w-4 text-sky-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        )}
      </button>

      {open && (
        <div className="border-t border-sky-200 bg-white px-4 py-3 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            </div>
          )}

          {isError && (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-2">가이드를 불러오지 못했어요</p>
              <button onClick={() => refetch()} className="text-xs text-sky-600 font-semibold">다시 시도</button>
            </div>
          )}

          {data && (
            <>
              {data.overview && (
                <div className="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-100 p-3">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-800 leading-relaxed">{data.overview}</p>
                </div>
              )}

              {(data.steps ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">클렌징 단계</p>
                  {data.steps.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-neutral-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                          {i + 1}
                        </span>
                        <p className="text-xs font-bold text-foreground">{s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.detail}</p>
                      {s.frequency && (
                        <p className="text-[10px] text-sky-600 font-semibold mt-1">{s.frequency}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(data.avoid ?? []).length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-xs font-bold text-red-700">피해야 할 것</p>
                  </div>
                  <ul className="space-y-0.5">
                    {data.avoid.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                        <span className="mt-0.5">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(data.products ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">추천 제품</p>
                  {data.products.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/explore?q=${encodeURIComponent(`${p.brand} ${p.name}`)}`)}
                      className="flex w-full items-start gap-2 rounded-xl border border-border bg-white p-2.5 text-left"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-base">
                        🧼
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground">{p.brand} {p.name}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{p.reason}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CleansingGuideCard;
