import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SKIN_TYPES, SKIN_CONCERNS, PERSONAL_COLORS } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [allergyInput, setAllergyInput] = useState('');
  const { profile, setSkinType, toggleConcern, setPersonalColor, setAllergies, completeOnboarding } = useUser();
  const navigate = useNavigate();

  const handleComplete = async () => {
    if (allergyInput.trim()) {
      setAllergies(allergyInput.split(',').map(s => s.trim()).filter(Boolean));
    }
    await completeOnboarding();
    navigate('/');
  };

  const steps = [
    <div key="skin" className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">피부 타입을 알려주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">맞춤 성분 분석을 위해 필요해요</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SKIN_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSkinType(type)}
            className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-all ${
              profile.skinType === type
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>,
    <div key="concerns" className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">피부 고민은 무엇인가요?</h2>
        <p className="mt-1 text-sm text-muted-foreground">복수 선택 가능해요</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SKIN_CONCERNS.map(concern => (
          <button
            key={concern}
            onClick={() => toggleConcern(concern)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
              profile.skinConcerns.includes(concern)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}
          >
            {concern}
          </button>
        ))}
      </div>
    </div>,
    <div key="color" className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">퍼스널컬러를 선택해주세요</h2>
        <p className="mt-1 text-sm text-muted-foreground">색조 제품 추천에 활용돼요</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PERSONAL_COLORS.map(color => (
          <button
            key={color}
            onClick={() => setPersonalColor(color)}
            className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
              profile.personalColor === color
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}
          >
            {color}
          </button>
        ))}
      </div>
    </div>,
    <div key="allergy" className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">알레르기 성분이 있나요?</h2>
        <p className="mt-1 text-sm text-muted-foreground">쉼표로 구분해서 입력해주세요</p>
      </div>
      <Input
        placeholder="예: 향료, 파라벤, 에탄올"
        value={allergyInput}
        onChange={e => setAllergyInput(e.target.value)}
        className="rounded-xl border-2 border-border py-3 text-center"
      />
    </div>,
  ];

  const canProceed = () => {
    if (step === 0) return !!profile.skinType;
    if (step === 1) return profile.skinConcerns.length > 0;
    if (step === 2) return !!profile.personalColor;
    return true;
  };

  return (
    <div className="flex min-h-screen flex-col gradient-soft">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary">BeautyLens</span>
        </div>
        <div className="mb-8 flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
        <div className="w-full max-w-sm">{steps[step]}</div>
        <div className="mt-8 flex w-full max-w-sm gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl">
              <ChevronLeft className="mr-1 h-4 w-4" />이전
            </Button>
          )}
          {step < 3 ? (
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
