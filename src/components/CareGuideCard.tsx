/**
 * CareGuideCard
 * - 보관함의 카테고리 분류(클렌징 / 스킨케어 / 썬케어 / 스페셜케어)와 일관된
 *   "피부 타입별 케어 가이드" 단일 카드.
 * - 사용자가 펼친 카테고리 탭만 lazy fetch (skin-coach EF, mode='careGuide')
 * - 24h 캐시로 재호출 비용 최소화.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import {
  Sparkles, ChevronRight, Loader2, ShieldAlert,
  Droplets, Layers, Sun, Star,
} from 'lucide-react';

interface CareStep {
  title: string;
  detail: string;
  frequency?: string;
}
interface CareProduct {
  name: string;
  brand: string;
  category: string;
  reason: string;
}
interface CareGuide {
  overview: string;
  steps: CareStep[];
  avoid: string[];
  products: CareProduct[];
}

type CategoryKey = 'cleansing' | 'skincare' | 'suncare' | 'specialcare';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: typeof Droplets;
  color: string;       // tailwind text color
  bg: string;          // tailwind bg color
  border: string;      // tailwind border color
  emoji: string;       // 추천 제품 아이콘
}

const CATEGORIES: CategoryDef[] = [
  { key: 'cleansing',   label: '클렌징',   icon: Droplets, color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200',    emoji: '🧼' },
  { key: 'skincare',    label: '스킨케어', icon: Layers,   color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200', emoji: '💧' },
  { key: 'suncare',     label: '썬케어',   icon: Sun,      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  emoji: '☀️' },
  { key: 'specialcare', label: '스페셜',   icon: Star,     color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200',   emoji: '✨' },
];

// 단일 카테고리 패널 — 펼쳐졌을 때만 fetch
const CategoryPanel = ({ def }: { def: CategoryDef }) => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const skinType = profile.skinType;

  const { data, isLoading, isError, refetch } = useQuery<CareGuide | null>({
    queryKey: ['care_guide', def.key, skinType, profile.skinSensitivity, profile.ageGroup],
    queryFn: async () => {
      if (!skinType) return null;
      const { data: result, error } = await supabase.functions.invoke('skin-coach', {
        body: {
          mode: 'careGuide',
          category: def.key,
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
      return (result ?? null) as CareGuide | null;
    },
    enabled: !!skinType,
    staleTime: 1000 * 60 * 60 * 24, // 24시간
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <div className="text-center py-5">
        <p className="text-xs text-muted-foreground mb-2">가이드를 불러오지 못했어요</p>
        <button onClick={() => refetch()} className={`text-xs font-semibold ${def.color}`}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data!.overview && (
        <div className={`flex items-start gap-2 rounded-xl ${def.bg} border ${def.border} p-3`}>
          <Sparkles className={`h-3.5 w-3.5 ${def.color} shrink-0 mt-0.5`} />
          <p className={`text-xs ${def.color} leading-relaxed`}>{data!.overview}</p>
        </div>
      )}

      {(data!.steps ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">단계별 방법</p>
          {data!.steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-neutral-50 p-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${def.bg} text-xs font-bold ${def.color}`}>
                  {i + 1}
                </span>
                <p className="text-xs font-bold text-foreground">{s.title}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.detail}</p>
              {s.frequency && (
                <p className={`text-[10px] ${def.color} font-semibold mt-1`}>{s.frequency}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {(data!.avoid ?? []).length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            <p className="text-xs font-bold text-red-700">피해야 할 것</p>
          </div>
          <ul className="space-y-0.5">
            {data!.avoid.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                <span className="mt-0.5">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data!.products ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">추천 제품</p>
          {data!.products.map((p, i) => (
            <button
              key={i}
              onClick={() => navigate(`/explore?q=${encodeURIComponent(`${p.brand} ${p.name}`)}`)}
              className="flex w-full items-start gap-2 rounded-xl border border-border bg-white p-2.5 text-left"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${def.bg} text-base`}>
                {def.emoji}
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
    </div>
  );
};

const CareGuideCard = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [active, setActive] = useState<CategoryKey | null>(null);

  const skinType = profile.skinType;

  // 피부 타입 미설정 시 — 진단 유도 카드만 표시
  if (!skinType) {
    return (
      <button
        onClick={() => navigate('/onboarding')}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-left shadow-card"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
          <Sparkles className="h-4 w-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">피부 타입별 케어 가이드</p>
          <p className="text-xs text-muted-foreground mt-0.5">먼저 피부 타입을 진단해주세요</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-card">
      {/* 헤더 */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-border">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          <p className="text-sm font-bold text-foreground">{skinType} 케어 가이드</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          카테고리를 선택하면 단계·추천 제품을 AI가 제안해요
        </p>
      </div>

      {/* 카테고리 칩 (4개) */}
      <div className="grid grid-cols-4 gap-1.5 p-3 border-b border-border bg-neutral-50">
        {CATEGORIES.map(c => {
          const Icon = c.icon;
          const isActive = active === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(prev => prev === c.key ? null : c.key)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 transition-all ${
                isActive
                  ? `${c.border} ${c.bg} ${c.color}`
                  : 'border-border bg-white text-muted-foreground'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? c.color : 'text-muted-foreground'}`} />
              <span className={`text-[11px] font-semibold ${isActive ? c.color : 'text-foreground'}`}>
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택된 카테고리 패널 */}
      {active ? (
        <div className="px-4 py-3">
          <CategoryPanel def={CATEGORIES.find(c => c.key === active)!} />
        </div>
      ) : (
        <p className="text-[11px] text-center text-muted-foreground py-5 px-4 leading-relaxed">
          위 카테고리 중 하나를 눌러 가이드를 확인하세요
        </p>
      )}
    </div>
  );
};

export default CareGuideCard;
