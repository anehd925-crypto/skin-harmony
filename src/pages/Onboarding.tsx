import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ─── Step 1: 피부 타입 ─── */
const SKIN_TYPE_OPTIONS = [
  { value: '건성',  label: '건성',  desc: '자주 당기고 건조해요',          emoji: '💧' },
  { value: '지성',  label: '지성',  desc: '번들거리고 모공이 넓어요',       emoji: '✨' },
  { value: '복합성', label: '복합성', desc: '부위마다 유분·수분이 달라요',   emoji: '🌿' },
  { value: '민감성', label: '민감성', desc: '쉽게 붉어지고 자극에 예민해요', emoji: '🌸' },
] as const;

/* ─── Step 2: 피부 고민 ─── */
const CONCERN_OPTIONS = [
  { value: 'hydration',   label: '수분부족' },
  { value: 'sebum',       label: '피지·번들' },
  { value: 'wrinkles',    label: '주름·탄력' },
  { value: 'sensitive',   label: '민감·홍조' },
  { value: 'pigmentation', label: '색소침착' },
  { value: 'pores',       label: '모공' },
  { value: 'clean_beauty', label: '클린뷰티' },
] as const;

const SENSITIVITY_LABELS: Record<number, string> = {
  1: '강한 편',
  2: '보통',
  3: '약간 민감',
  4: '민감한 편',
  5: '매우 민감',
};

const ALLERGEN_OPTIONS = [
  '알코올', '향료', '파라벤', '설페이트', '실리콘',
  '미네랄오일', '인공색소', '레티놀', '살리실산',
];

/* ─── Step 3: 연령대 + 루틴 ─── */
const AGE_RANGE_OPTIONS = [
  { value: 'teens',    label: '10대' },
  { value: '20s_early', label: '20대 초반' },
  { value: '20s_late',  label: '20대 후반' },
  { value: '30s',      label: '30대' },
  { value: '40s',      label: '40대' },
  { value: '50s_plus', label: '50대 이상' },
] as const;

const ROUTINE_OPTIONS = [
  { value: 'minimalist',  label: '미니멀',       desc: '3단계 이내' },
  { value: 'layering',    label: '레이어링',      desc: '상태에 맞게 쌓아요' },
  { value: 'kbeauty_10',  label: 'K뷰티 10단계', desc: '꼼꼼한 다단계 케어' },
  { value: 'clean_beauty', label: '클린뷰티',     desc: '성분 안전성 우선' },
  { value: 'anti_aging',  label: '안티에이징',   desc: '노화 방지 집중' },
] as const;

/* ─── Helper ─── */
const sensitivityToString = (level: number): string => {
  if (level >= 5) return 'very_sensitive';
  if (level >= 4) return 'sensitive';
  if (level <= 1) return 'resilient';
  return 'normal';
};

const ageRangeToGroup = (range: string): string => {
  const map: Record<string, string> = {
    'teens': '10s', '20s_early': '20s', '20s_late': '20s',
    '30s': '30s', '40s': '40s', '50s_plus': '50s_plus',
  };
  return map[range] ?? '';
};

const MAX_CONCERNS = 3;
const TOTAL_STEPS = 3;

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, completeOnboarding } = useUser();
  const { toast } = useToast();

  const isReDiagnose = profile.onboardingComplete;

  /* ── 단계 ── */
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ── Step 1 ── */
  const [skinType, setSkinTypeVal] = useState('');

  /* ── Step 2 ── */
  const [concerns, setConcerns] = useState<string[]>([]);
  const [sensitivityLevel, setSensitivityLevel] = useState(3);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isPregnant, setIsPregnant] = useState(false);

  /* ── Step 3 ── */
  const [ageRange, setAgeRange] = useState('');
  const [preferredRoutines, setPreferredRoutines] = useState<string[]>([]);
  const [skinHistory, setSkinHistory] = useState('');

  /* 기존 프로필로 pre-fill */
  useEffect(() => {
    if (!profile.onboardingComplete) return;
    if (profile.skinType) setSkinTypeVal(String(profile.skinType));
    if (profile.skinConcerns?.length) setConcerns(profile.skinConcerns as string[]);
    if (profile.allergies?.length) setAllergens(profile.allergies);
    if (profile.specialCondition === 'pregnant') setIsPregnant(true);
    if (profile.ageGroup) {
      const map: Record<string, string> = {
        '10s': 'teens', '20s': '20s_early', '30s': '30s', '40s': '40s', '50s_plus': '50s_plus',
      };
      setAgeRange(map[profile.ageGroup] ?? '');
    }
    if (profile.skinGoals?.length) setPreferredRoutines(profile.skinGoals as string[]);
  }, [profile.onboardingComplete]);

  /* ── 고민 토글 (최대 3개) ── */
  const toggleConcern = (value: string) => {
    setConcerns(prev => {
      if (prev.includes(value)) return prev.filter(c => c !== value);
      if (prev.length >= MAX_CONCERNS) return [...prev.slice(1), value];
      return [...prev, value];
    });
  };

  /* ── 알레르기 토글 ── */
  const toggleAllergen = (value: string) => {
    setAllergens(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value],
    );
  };

  /* ── 루틴 토글 ── */
  const toggleRoutine = (value: string) => {
    setPreferredRoutines(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value],
    );
  };

  /* ── 완료 저장 ── */
  const handleComplete = async () => {
    if (submitting || !user) return;
    setSubmitting(true);
    try {
      await completeOnboarding({
        skinType: skinType as never,
        skinConcerns: concerns as never,
        allergies: allergens,
        skinSensitivity: sensitivityToString(sensitivityLevel) as never,
        ageGroup: ageRangeToGroup(ageRange) as never,
        skinGoals: preferredRoutines as never,
        specialCondition: isPregnant ? 'pregnant' : 'none',
      });
      if (isReDiagnose) {
        toast({ title: '피부 프로필을 업데이트했어요' });
        navigate(-1);
      } else {
        navigate('/');
      }
    } catch (err) {
      toast({
        title: '저장에 실패했어요',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 건너뛰기 (Step2, Step3에서만) ── */
  const handleSkip = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
      return;
    }
    // 마지막 단계에서 건너뛰기 = 지금까지 입력값으로 완료
    await handleComplete();
  };

  const canProceed = step === 0 ? !!skinType : true;

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── 상단 고정: 헤더 + 프로그레스 바 ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border pt-safe">
        <div className="mx-auto max-w-md px-4 pt-4 pb-3">
          {/* 브랜드 + 뒤로가기 */}
          <div className="flex items-center mb-3">
            <span className="font-display text-base font-semibold text-brand-700">BeautyLens</span>
            {(isReDiagnose || step > 0) && (
              <button
                onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1 as never)}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"
                aria-label="이전"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> 이전
              </button>
            )}
          </div>

          {/* 프로그레스 바 3단 */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-base ease-brand',
                  i < step ? 'bg-brand-700' : i === step ? 'bg-brand-400' : 'bg-border',
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {step + 1} / {TOTAL_STEPS}
          </p>
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Step 1: 피부 타입 */}
        {step === 0 && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">Step 1</p>
              <h2 className="text-xl font-bold text-foreground">피부 타입을 선택해주세요</h2>
              <p className="mt-1 text-sm text-muted-foreground">하나만 선택해요. 나중에 바꿀 수 있어요.</p>
            </div>

            <div className="space-y-2.5">
              {SKIN_TYPE_OPTIONS.map(({ value, label, desc, emoji }) => (
                <button
                  key={value}
                  onClick={() => setSkinTypeVal(value)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-base ease-brand',
                    skinType === value
                      ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                      : 'border-border bg-card hover:border-brand-300',
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <p className={cn(
                      'text-sm font-semibold',
                      skinType === value ? 'text-brand-700' : 'text-foreground',
                    )}>
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {skinType === value && (
                    <div className="h-5 w-5 shrink-0 rounded-full bg-brand-700 flex items-center justify-center">
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: 고민 + 민감도 + 알러지 + 임신 */}
        {step === 1 && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">Step 2</p>
              <h2 className="text-xl font-bold text-foreground">피부 고민을 알려주세요</h2>
              <p className="mt-1 text-sm text-muted-foreground">최대 3개까지 선택할 수 있어요.</p>
            </div>

            {/* 피부 고민 태그 */}
            <div>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map(({ value, label }) => {
                  const idx = concerns.indexOf(value);
                  const selected = idx !== -1;
                  return (
                    <button
                      key={value}
                      onClick={() => toggleConcern(value)}
                      className={cn(
                        'relative rounded-full border px-4 py-2 text-sm font-medium transition-all duration-base ease-brand',
                        selected
                          ? 'border-brand-700 bg-brand-700 text-white'
                          : 'border-border bg-card text-foreground hover:border-brand-300',
                      )}
                    >
                      {label}
                      {selected && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {concerns.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  선택 순서가 우선순위예요 · {concerns.length}/{MAX_CONCERNS}
                </p>
              )}
            </div>

            {/* 민감도 카드 선택 */}
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">피부 민감도</p>
              <div className="grid grid-cols-3 gap-2.5">
                {([
                  { value: 2, emoji: '😊', label: '강한 편이에요', desc: '자극에 잘 안 민감해요' },
                  { value: 3, emoji: '😐', label: '보통이에요', desc: '가끔 예민할 때 있어요' },
                  { value: 5, emoji: '😣', label: '자주 예민해요', desc: '쉽게 붉어지고 자극 있어요' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSensitivityLevel(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-base ease-brand',
                      sensitivityLevel === opt.value
                        ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700'
                        : 'border-border bg-card hover:border-brand-300',
                    )}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className={cn(
                      'text-xs font-bold leading-snug',
                      sensitivityLevel === opt.value ? 'text-brand-700' : 'text-foreground',
                    )}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 알러지 성분 태그 */}
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">피하고 싶은 성분</p>
              <p className="mb-3 text-xs text-muted-foreground">복수 선택 가능해요.</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleAllergen(a)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      allergens.includes(a)
                        ? 'border-harmful bg-harmful text-white'
                        : 'border-border bg-card text-foreground hover:border-harmful/40',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* 임신/수유 토글 */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">임신·수유 중이에요</p>
                <p className="text-xs text-muted-foreground mt-0.5">레티놀·살리실산 등을 강화 경고해요</p>
              </div>
              <Switch checked={isPregnant} onCheckedChange={setIsPregnant} />
            </div>
          </>
        )}

        {/* Step 3: 연령대 + 루틴 + 자유서술 */}
        {step === 2 && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">Step 3</p>
              <h2 className="text-xl font-bold text-foreground">마지막 단계예요</h2>
              <p className="mt-1 text-sm text-muted-foreground">모두 선택 사항이에요. 건너뛸 수 있어요.</p>
            </div>

            {/* 연령대 */}
            <div>
              <p className="mb-2.5 text-sm font-semibold text-foreground">연령대</p>
              <div className="grid grid-cols-3 gap-2">
                {AGE_RANGE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setAgeRange(prev => prev === value ? '' : value)}
                    className={cn(
                      'rounded-xl border py-3 text-sm font-medium transition-all',
                      ageRange === value
                        ? 'border-brand-700 bg-brand-50 text-brand-700'
                        : 'border-border bg-card text-foreground hover:border-brand-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 루틴 선호 */}
            <div>
              <p className="mb-2.5 text-sm font-semibold text-foreground">선호하는 루틴</p>
              <div className="space-y-2">
                {ROUTINE_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => toggleRoutine(value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                      preferredRoutines.includes(value)
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-border bg-card hover:border-brand-200',
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 shrink-0 rounded border transition-all',
                      preferredRoutines.includes(value)
                        ? 'border-brand-700 bg-brand-700'
                        : 'border-border',
                    )}>
                      {preferredRoutines.includes(value) && (
                        <svg viewBox="0 0 12 12" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        preferredRoutines.includes(value) ? 'text-brand-700' : 'text-foreground',
                      )}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 자유 서술 */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">
                기타 피부 상태 메모
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(선택)</span>
              </p>
              <Textarea
                value={skinHistory}
                onChange={e => setSkinHistory(e.target.value)}
                placeholder="예: 환절기마다 건조해지고 눈가에 주름이 신경 쓰여요"
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </>
        )}
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border pb-safe">
        <div className="mx-auto max-w-md flex flex-col gap-2 px-4 pt-3 pb-5">
          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                className="flex-none gap-1"
                aria-label="이전 단계"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
                className="flex-1 gap-1"
              >
                다음 <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? '저장 중...' : isReDiagnose ? '프로필 업데이트' : '시작하기'}
              </Button>
            )}
          </div>

          {/* Step 2, 3에서 건너뛰기 */}
          {step > 0 && (
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="text-center text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-40"
            >
              {step === TOTAL_STEPS - 1 ? '지금까지 입력한 내용으로 완료' : '건너뛰기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
