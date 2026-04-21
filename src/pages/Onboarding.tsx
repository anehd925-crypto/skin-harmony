/**
 * Onboarding (단일 통합 진단 페이지)
 *
 * 이 페이지는 두 가지 모드를 자동 분기로 모두 처리한다.
 *  1) 신규 사용자(`profile.onboardingComplete === false`)
 *     → 풀 6단계 온보딩 (연령대 → AI 진단 → 고민 → 목표 → 특수조건 → 색·알레르기)
 *  2) 재진단(`profile.onboardingComplete === true`)
 *     → AI 진단 단계만 표시 + "프로필에 반영" + 보관함 연결 카드
 *
 * 종전의 별도 `/skin-test` 페이지를 흡수해 진단 진입점을 단 1개로 일원화.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useUser,
  SKIN_CONCERNS, PERSONAL_COLORS,
  SKIN_CONDITIONS, AGE_GROUPS, SKIN_GOALS, AVOID_INGREDIENTS,
  SPECIAL_CONDITIONS,
  type SkinConcern,
} from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles, ChevronRight, ChevronLeft, RotateCcw,
  Package, Plus, Home as HomeIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SkinTypeDecider, { type DiagnosisResult } from '@/components/SkinTypeDecider';
import {
  saveSkinTest, loadSkinTestAnswers, loadSkinTestResult,
} from '@/utils/skinTestStorage';
import BottomNav from '@/components/BottomNav';

const TOTAL_STEPS = 6;

const sensitivityLabel = (v: string | null | undefined): string => {
  switch (v) {
    case 'very_sensitive': return '매우 민감';
    case 'sensitive': return '민감한 편';
    case 'normal': return '보통';
    case 'resilient': return '강한 편';
    default: return '-';
  }
};

const conditionLabel = (v: DiagnosisResult['skinCondition']) =>
  ({ very_dry: '매우 건조', dry: '건조한 편', normal: '보통', oily: '약간 번들', very_oily: '많이 번들' }[v]);

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    profile,
    setSkinType, toggleConcern, setConcernPriority,
    setPersonalColor, setAllergies,
    setSkinSensitivity, setSkinCondition, setAgeGroup,
    toggleGoal, toggleAvoid,
    setSpecialCondition,
    completeOnboarding, saveProfile,
  } = useUser();

  // 재진단 모드: 이미 온보딩을 마친 사용자가 진입한 경우
  const isReDiagnose = profile.onboardingComplete;

  // ── 공통 상태 ───────────────────────────────────────────────
  const [aiDiagnosis, setAiDiagnosis] = useState<DiagnosisResult | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ── 신규 온보딩 전용 상태 ───────────────────────────────────
  const [step, setStep] = useState(0);
  const [allergyInput, setAllergyInput] = useState('');

  // ── 재진단 전용 상태 ────────────────────────────────────────
  const [initialAnswers, setInitialAnswers] = useState<Record<string, string> | null>(null);
  const [initialResult, setInitialResult] = useState<DiagnosisResult | null>(null);
  const [latestAnswers, setLatestAnswers] = useState<Record<string, string> | null>(null);
  const [redResult, setRedResult] = useState<DiagnosisResult | null>(null);
  const [applied, setApplied] = useState(false);

  // 재진단 진입 시 직전 답변·결과를 SkinTypeDecider props로만 prefill.
  // 부모 redResult는 채우지 않는다 — SkinTypeDecider가 결과 화면을 띄우면
  // 그 컴포넌트의 onResolved 흐름과 어긋나지 않도록 "사용자가 직접 결과를 확정한 시점"에만
  // 부모 CTA(프로필 반영 버튼)가 노출되어야 한다.
  // (이렇게 하지 않으면 답변 도중에도 부모 CTA가 떠서 UX가 어긋남)
  useEffect(() => {
    if (!isReDiagnose || !user) return;
    const prevAnswers = loadSkinTestAnswers(user.id);
    const prevResult = loadSkinTestResult(user.id);
    if (prevAnswers) setInitialAnswers(prevAnswers);
    if (prevResult) setInitialResult(prevResult);
  }, [isReDiagnose, user]);

  // 재진단 모드의 "다음 단계" 안내용: 보관함 제품 개수
  const { data: cabinetCount = 0 } = useQuery({
    queryKey: ['cabinet_count_onboarding', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('my_cabinet' as never)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return count ?? 0;
    },
    enabled: !!user && isReDiagnose,
  });

  // ── 진단 결과 핸들러 (모드별 분기) ────────────────────────────
  const handleAiResolved = (r: DiagnosisResult, ans: Record<string, string>) => {
    if (isReDiagnose) {
      setRedResult(r);
      setLatestAnswers(ans);
      setApplied(false);
      // 캐시는 즉시 갱신 (DB 반영은 사용자가 명시적으로 버튼을 눌러야 함)
      if (user) saveSkinTest(user.id, ans, r);
      return;
    }
    // 신규 온보딩: 진단 결과를 프로필 3개 필드에 즉시 반영
    setAiDiagnosis(r);
    setSkinType(r.skinType);
    setSkinCondition(r.skinCondition);
    setSkinSensitivity(r.skinSensitivity);
    if (user) saveSkinTest(user.id, ans, r);
  };

  const handleResetDiagnosis = () => {
    if (isReDiagnose) {
      setRedResult(null);
      setInitialResult(null);
      setApplied(false);
    } else {
      setAiDiagnosis(null);
      setSkinType('');
    }
    setRestartKey(k => k + 1);
  };

  // ── 재진단: 프로필에 반영 ──────────────────────────────────
  const applyReDiagnoseToProfile = async () => {
    if (!redResult || !user) return;
    setSkinType(redResult.skinType);
    setSkinCondition(redResult.skinCondition);
    setSkinSensitivity(redResult.skinSensitivity);
    try {
      await saveProfile({
        skinType: redResult.skinType,
        skinCondition: redResult.skinCondition,
        skinSensitivity: redResult.skinSensitivity,
      });
      saveSkinTest(user.id, latestAnswers ?? initialAnswers ?? {}, redResult);
      setApplied(true);
      toast({
        title: '프로필에 반영했어요',
        description: `${redResult.skinType} · ${conditionLabel(redResult.skinCondition)} · ${sensitivityLabel(redResult.skinSensitivity)}`,
      });
    } catch {
      toast({ title: '반영 실패', variant: 'destructive' });
    }
  };

  // ── 신규 온보딩: 완료 ──────────────────────────────────────
  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    const finalAllergies = allergyInput.trim()
      ? allergyInput.split(',').map(s => s.trim()).filter(Boolean)
      : profile.allergies;
    setAllergies(finalAllergies);

    try {
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

  const handleToggleConcern = (c: SkinConcern) => {
    toggleConcern(c);
    if (!profile.skinConcerns.includes(c)) {
      setConcernPriority([...profile.concernPriority.filter(x => x !== c), c]);
    } else {
      setConcernPriority(profile.concernPriority.filter(x => x !== c));
    }
  };

  // ════════════════════════════════════════════════════════════
  // 재진단 모드 화면 — SkinTest의 후속 UX 흡수
  // ════════════════════════════════════════════════════════════
  if (isReDiagnose) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-24">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 hover:bg-neutral-100"
            aria-label="홈으로"
          >
            <HomeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">홈</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground">피부 타입 진단</h1>
            <p className="text-[11px] text-muted-foreground">
              6문항으로 피부 타입·유수분·민감도가 한 번에 결정돼요
            </p>
          </div>
          {redResult && (
            <button
              onClick={handleResetDiagnosis}
              className="flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3" /> 다시
            </button>
          )}
        </div>

        <div className="px-4 pt-6 pb-8">
          <SkinTypeDecider
            key={restartKey}
            variant="full"
            initialAnswers={initialAnswers}
            initialResult={initialResult}
            onResolved={handleAiResolved}
            onRestart={handleResetDiagnosis}
          />

          {redResult && (
            <div className="mt-4 space-y-3">
              {!applied ? (
                <button
                  onClick={applyReDiagnoseToProfile}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground"
                >
                  이 결과를 내 프로필에 반영하기
                </button>
              ) : (
                <button disabled className="w-full rounded-xl bg-green-500 py-4 text-sm font-bold text-white">
                  반영 완료
                </button>
              )}

              {applied && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-violet-600 shrink-0" />
                    <p className="text-sm font-bold text-violet-900">
                      {cabinetCount > 0
                        ? '내 화장품이 이 피부에 맞는지 확인해보세요'
                        : '쓰는 화장품을 등록하면 적합도를 바로 확인할 수 있어요'}
                    </p>
                  </div>
                  <p className="text-[11px] text-violet-700 leading-relaxed">
                    {cabinetCount > 0
                      ? `보관함에 ${cabinetCount}개 제품이 있어요. 진단 결과 기준으로 성분·적합도를 다시 점검해보세요.`
                      : '보관함에 제품을 추가하면 진단 결과(피부 타입·민감도 등)를 기준으로 자동 적합도 분석이 적용됩니다.'}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {cabinetCount > 0 ? (
                      <>
                        <button
                          onClick={() => navigate('/cabinet')}
                          className="flex items-center justify-between rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Package className="h-4 w-4" /> 내 보관함 적합도 확인하기
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-80" />
                        </button>
                        <button
                          onClick={() => navigate('/cabinet', { state: { openAdd: true } })}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-300 bg-white py-2.5 text-xs font-semibold text-violet-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> 새 제품 추가하기
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate('/cabinet', { state: { openAdd: true } })}
                        className="flex items-center justify-between rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Plus className="h-4 w-4" /> 내 화장품 등록하러 가기
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-80" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!applied && (
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  프로필에 반영하면 보관함 제품 적합도와 루틴 추천에<br />이 진단 결과가 자동으로 적용됩니다
                </p>
              )}

              {/* 결과 화면에서는 항상 "홈으로 가기" CTA를 노출 — 반영 전후 모두 종료 가능 */}
              <button
                onClick={() => navigate('/')}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-3 text-sm font-semibold text-foreground hover:bg-neutral-50"
              >
                <HomeIcon className="h-4 w-4" /> 홈으로 가기
              </button>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // 신규 사용자 — 6단계 풀 온보딩
  // ════════════════════════════════════════════════════════════
  const steps = useMemo(() => [
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

    // Step 1: 피부 진단
    <div key="skin" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 2</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">피부 타입 진단</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          6문항으로 피부 타입·유수분·민감도가 한 번에 결정됩니다
        </p>
      </div>

      {!aiDiagnosis ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SkinTypeDecider key={restartKey} variant="compact" onResolved={handleAiResolved} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">진단 결과</p>
            </div>
            <p className="text-lg font-bold text-primary">{profile.skinType}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{aiDiagnosis.summary}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/70 border border-primary/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-muted-foreground">유수분</p>
                <p className="text-xs font-bold text-foreground">
                  {SKIN_CONDITIONS.find(c => c.value === profile.skinCondition)?.label ?? '-'}
                </p>
              </div>
              <div className="rounded-lg bg-white/70 border border-primary/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-muted-foreground">민감도</p>
                <p className="text-xs font-bold text-foreground">
                  {sensitivityLabel(profile.skinSensitivity)}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDiagnosis}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" /> 답변을 바꿔서 다시 진단하기
          </button>
        </div>
      )}
    </div>,

    // Step 2: 피부 고민
    <div key="concerns" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 3</p>
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

    // Step 3: 목표 + 기피 성분
    <div key="goals" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 4</p>
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

    // Step 4: 특수 피부 조건
    <div key="special" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 5</p>
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

    // Step 5: 퍼스널컬러 + 알레르기
    <div key="color" className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 6</p>
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
  ], [
    profile, aiDiagnosis, restartKey, allergyInput,
    setAgeGroup, setPersonalColor, setSpecialCondition, toggleGoal, toggleAvoid,
  ]);

  const canProceed = () => {
    if (step === 0) return !!profile.ageGroup;
    if (step === 1) return !!aiDiagnosis && !!profile.skinType && !!profile.skinCondition && !!profile.skinSensitivity;
    if (step === 2) return profile.skinConcerns.length > 0;
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
