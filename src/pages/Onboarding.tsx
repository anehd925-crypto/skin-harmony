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
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const TOTAL_STEPS = 7;

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [allergyInput, setAllergyInput] = useState('');
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

  const handleComplete = async () => {
    if (allergyInput.trim()) {
      setAllergies(allergyInput.split(',').map(s => s.trim()).filter(Boolean));
    }
    await completeOnboarding();
    navigate('/');
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
            className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
              profile.ageGroup === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}>
            {label}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: 피부타입 + 유분수분 상태
    <div key="skin" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 2</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">피부 타입을 알려주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">피부의 유분·수분 상태를 기준으로 선택해요</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SKIN_TYPES.map(type => (
          <button key={type} onClick={() => setSkinType(type)}
            className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-all ${
              profile.skinType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}>
            {type}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">유수분 밸런스</p>
        <p className="mb-3 text-xs text-muted-foreground">세안 후 2시간 기준으로 선택해주세요</p>
        <div className="space-y-2">
          {SKIN_CONDITIONS.map(({ value, label, desc }) => (
            <button key={value} onClick={() => setSkinCondition(value)}
              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                profile.skinCondition === value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
              }`}>
              <p className={`text-sm font-semibold ${profile.skinCondition === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>
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
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
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
              className={`relative rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                profile.skinConcerns.includes(concern) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
              }`}>
              {concern}
              {priority > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
              className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
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
              className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
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
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
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
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
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
          className="rounded-xl border-2 border-border"
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
    <div className="flex min-h-screen flex-col gradient-soft">
      <div className="flex flex-1 flex-col items-center justify-start px-6 py-10 overflow-y-auto">
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
          <p className="mt-1.5 text-right text-xs text-muted-foreground">{step + 1} / {TOTAL_STEPS}</p>
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
            <Button onClick={handleComplete} className="flex-1 rounded-xl gradient-primary text-primary-foreground">
              시작하기 ✨
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
