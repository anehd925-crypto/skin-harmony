import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useUser,
  SKIN_TYPES, SKIN_CONCERNS, PERSONAL_COLORS,
  SKIN_SENSITIVITIES, SKIN_CONDITIONS, AGE_GROUPS, SKIN_GOALS, AVOID_INGREDIENTS,
  SPECIAL_CONDITIONS,
  type SkinConcern,
} from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SkinTypeDecider, { type DiagnosisResult } from '@/components/SkinTypeDecider';

const TOTAL_STEPS = 7;

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [allergyInput, setAllergyInput] = useState('');
  const [aiDiagnosis, setAiDiagnosis] = useState<DiagnosisResult | null>(null);
  const [editingType, setEditingType] = useState(false);
  const {
    profile,
    setSkinType, toggleConcern, setConcernPriority,
    setPersonalColor, setAllergies,
    setSkinSensitivity, setSkinCondition, setAgeGroup,
    toggleGoal, toggleAvoid,
    setSpecialCondition,
    completeOnboarding,
  } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleAiResolved = (r: DiagnosisResult) => {
    setAiDiagnosis(r);
    setSkinType(r.skinType);
    // 설문의 moisture 답 → 유수분 상태 자동 매핑
    if (r.skinCondition) setSkinCondition(r.skinCondition);
    // 설문의 자극 민감도 → 피부 민감도 기본값 자동 매핑 (사용자는 Step 3에서 수정 가능)
    const sensitivityMap: Record<string, string> = {
      very_high: 'very_high',
      high: 'high',
      normal: 'normal',
      low: 'low',
    };
    const mapped = r.suggestedSensitivity ? sensitivityMap[r.suggestedSensitivity] : undefined;
    if (mapped) setSkinSensitivity(mapped);
    else if (r.skinTypeEn === 'sensitive') setSkinSensitivity('high');
    setEditingType(false);
  };

  const handleResetDiagnosis = () => {
    setAiDiagnosis(null);
    setSkinType('');
    setEditingType(false);
  };

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    const finalAllergies = allergyInput.trim()
      ? allergyInput.split(',').map(s => s.trim()).filter(Boolean)
      : profile.allergies;
    // UI 상태도 동기화
    setAllergies(finalAllergies);

    try {
      // 최종 payload에 알레르기를 명시적으로 합성해 setState race를 회피한다.
      await completeOnboarding({ allergies: finalAllergies });
      navigate('/');
    } catch (err) {
      toast({
        title: '프로필 저장 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 고민 우선순위: 선택 순서가 곧 우선순위
  const handleToggleConcern = (c: SkinConcern) => {
    toggleConcern(c);
    if (!profile.skinConcerns.includes(c)) {
      setConcernPriority([...profile.concernPriority.filter(x => x !== c), c]);
    } else {
      setConcernPriority(profile.concernPriority.filter(x => x !== c));
    }
  };

  const steps = [
    // Step 0: 연령대
    <div key="age" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 1</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">연령대를 알려주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">연령별 피부 특성을 반영한 추천을 드려요</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {AGE_GROUPS.map(({ value, label }) => (
          <button key={value} onClick={() => setAgeGroup(value)}
            className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
              profile.ageGroup === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}>
            {label}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: 피부타입 + 유수분 상태 (AI 설문 단일 흐름으로 통합)
    <div key="skin" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 2</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">피부 타입을 알아볼게요</h2>
        <p className="mt-1 text-sm text-muted-foreground">6가지 설문으로 피부 타입·유수분 상태가 자동 설정됩니다</p>
      </div>

      {!aiDiagnosis ? (
        // ── 설문 진행 ──
        <div className="rounded-2xl border border-border bg-card p-4">
          <SkinTypeDecider variant="compact" onResolved={handleAiResolved} />
        </div>
      ) : (
        // ── 결과 확인 + 필요 시 수정 ──
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">진단 결과</p>
            </div>
            <p className="text-xs text-muted-foreground mb-1">진단된 피부 타입</p>
            <p className="text-lg font-bold text-primary">{profile.skinType}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{aiDiagnosis.summary}</p>

            {profile.skinCondition && (
              <div className="mt-3 rounded-lg bg-white/70 border border-primary/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-muted-foreground">자동 설정된 유수분 상태</p>
                <p className="text-xs font-bold text-foreground">
                  {SKIN_CONDITIONS.find(c => c.value === profile.skinCondition)?.label ?? profile.skinCondition}
                </p>
              </div>
            )}
          </div>

          {/* 결과 수정: 진단 결과가 실제와 다를 때만 사용 */}
          {!editingType ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingType(true)}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground"
              >
                결과가 다른가요? 직접 수정
              </button>
              <button
                type="button"
                onClick={handleResetDiagnosis}
                className="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3" /> 재진단
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">피부 타입 직접 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {SKIN_TYPES.map(type => (
                  <button key={type} type="button" onClick={() => setSkinType(type)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                      profile.skinType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-foreground hover:border-primary/40'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-foreground mt-2">유수분 상태</p>
              <div className="space-y-1.5">
                {SKIN_CONDITIONS.map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => setSkinCondition(value)}
                    className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                      profile.skinCondition === value ? 'border-primary bg-primary/10' : 'border-border bg-white hover:border-primary/40'
                    }`}>
                    <p className={`text-sm font-semibold ${profile.skinCondition === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditingType(false)}
                className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
              >
                수정 완료
              </button>
            </div>
          )}
        </div>
      )}
    </div>,

    // Step 2: 민감도
    <div key="sensitivity" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 3</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">피부 민감도는 어느 정도인가요?</h2>
        <p className="mt-1 text-sm text-muted-foreground">성분 안전도 기준을 맞춤 조정해요</p>
      </div>
      <div className="space-y-2">
        {SKIN_SENSITIVITIES.map(({ value, label, desc }) => (
          <button key={value} onClick={() => setSkinSensitivity(value)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              profile.skinSensitivity === value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
            }`}>
            <p className={`text-sm font-semibold ${profile.skinSensitivity === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 3: 피부 고민 (우선순위 포함)
    <div key="concerns" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 4</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">피부 고민을 선택해주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">먼저 선택한 순서가 우선순위가 돼요</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SKIN_CONCERNS.map(concern => {
          const priority = profile.concernPriority.indexOf(concern) + 1;
          return (
            <button key={concern} onClick={() => handleToggleConcern(concern)}
              className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                profile.skinConcerns.includes(concern) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
              }`}>
              {concern}
              {priority > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {priority}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {profile.skinConcerns.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-1">우선순위 순서</p>
          <p className="text-xs text-muted-foreground">{profile.concernPriority.join(' → ')}</p>
        </div>
      )}
    </div>,

    // Step 4: 스킨케어 목표 + 기피 성분
    <div key="goals" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 5</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">스킨케어 목표와 기피 성분</h2>
        <p className="mt-1 text-sm text-muted-foreground">원하는 효과와 피하고 싶은 성분을 선택해요</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">목표 (복수 선택)</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_GOALS.map(g => (
            <button key={g} onClick={() => toggleGoal(g)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                profile.skinGoals.includes(g) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
              }`}>{g}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">기피 성분 (복수 선택)</p>
        <div className="flex flex-wrap gap-2">
          {AVOID_INGREDIENTS.map(a => (
            <button key={a} onClick={() => toggleAvoid(a)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                profile.avoidIngredients.includes(a) ? 'border-danger/70 bg-danger/10 text-danger' : 'border-border bg-card text-foreground hover:border-danger/40'
              }`}>{a}</button>
          ))}
        </div>
      </div>
    </div>,

    // Step 5: 특수 피부 조건
    <div key="special" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 6</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">특별한 피부 조건이 있으신가요?</h2>
        <p className="mt-1 text-sm text-muted-foreground">해당 조건에 맞는 성분 경고를 강화해 드려요</p>
      </div>
      <div className="space-y-2">
        {SPECIAL_CONDITIONS.map(({ value, label, desc }) => (
          <button key={value} onClick={() => setSpecialCondition(value)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              profile.specialCondition === value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
            }`}>
            <p className={`text-sm font-semibold ${profile.specialCondition === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 6: 퍼스널컬러 + 알레르기
    <div key="color" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 7</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">마지막 단계예요</h2>
        <p className="mt-1 text-sm text-muted-foreground">색조 추천과 알레르기 정보를 입력해주세요</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">퍼스널컬러</p>
        <div className="grid grid-cols-3 gap-2">
          {PERSONAL_COLORS.map(color => (
            <button key={color} onClick={() => setPersonalColor(color)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                profile.personalColor === color ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
              }`}>{color}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">알레르기 성분 (직접 입력)</p>
        <p className="mb-2 text-xs text-muted-foreground">기피 성분에 없는 특정 성분이 있다면 입력해주세요</p>
        <Input
          placeholder="예: 프로폴리스, 티트리오일"
          value={allergyInput}
          onChange={e => setAllergyInput(e.target.value)}
          className="rounded-xl border border-border"
        />
      </div>
    </div>,
  ];

  const canProceed = () => {
    if (step === 0) return !!profile.ageGroup;
    if (step === 1) return !!profile.skinType && !!profile.skinCondition;
    if (step === 2) return !!profile.skinSensitivity;
    if (step === 3) return profile.skinConcerns.length > 0;
    return true;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 overflow-y-auto">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">BeautyLens</span>
        </div>
        {/* 진행 바 */}
        <div className="mb-6 w-full max-w-sm">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{step + 1} / {TOTAL_STEPS}</p>
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary disabled:opacity-40"
            >
              {submitting ? '저장 중...' : '건너뛰기'}
            </button>
          </div>
        </div>

        <div className="w-full max-w-sm">{steps[step]}</div>

        <div className="mt-8 flex w-full max-w-sm gap-3 sticky bottom-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl">
              <ChevronLeft className="mr-1 h-4 w-4" />이전
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="flex-1 rounded-xl gradient-primary text-primary-foreground">
              다음<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={submitting}
              className="flex-1 rounded-xl gradient-primary text-primary-foreground"
            >
              {submitting ? '저장 중...' : '시작하기 ✨'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
