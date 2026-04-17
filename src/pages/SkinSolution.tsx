import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { ChevronLeft, Stethoscope, AlertTriangle, Pill, Droplets, Sun, Moon, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const TROUBLE_TYPES = [
  { id: 'whitehead', label: '화이트헤드', emoji: '⚪', desc: '막힌 모공' },
  { id: 'blackhead', label: '블랙헤드', emoji: '⚫', desc: '산화된 피지' },
  { id: 'papule', label: '여드름(구진)', emoji: '🔴', desc: '붉고 볼록' },
  { id: 'pustule', label: '농포', emoji: '🟡', desc: '고름 있는' },
  { id: 'nodule', label: '낭종/결절', emoji: '🟤', desc: '깊고 단단한' },
  { id: 'cystic', label: '점액낭종', emoji: '💜', desc: '크고 깊은 낭종' },
  { id: 'redness', label: '홍조/민감', emoji: '🌸', desc: '붉어짐' },
  { id: 'dryness', label: '건조/각질', emoji: '🍂', desc: '당김·뒤집힘' },
  { id: 'pigment', label: '색소침착', emoji: '🟫', desc: '잡티·다크스팟' },
  { id: 'atopy', label: '아토피/습진', emoji: '🌿', desc: '가려움·발진' },
];

const LOCATIONS = ['이마', '코', '볼', '턱·입주변', '전체', '목·데콜테'];
const DURATIONS = ['오늘 생겼어요', '1주일 이내', '한 달 이내', '수개월 이상'];

type MedicineType = {
  name: string;
  type: string;
  activeIngredient: string;
  purpose: string;
  howToUse: string;
  frequency: string;
  duration: string;
  caution: string;
  isOTC: boolean;
  purchaseLocation: string;
  priceRange: string;
};

type RoutineStep = {
  step: number;
  category: string;
  instruction: string;
  keyIngredient: string;
};

type SolutionResult = {
  causeAnalysis: string;
  severity: 'mild' | 'moderate' | 'severe';
  needsDermatologist: boolean;
  dermatologistReason?: string;
  otcMedicines: MedicineType[];
  avoidIngredients: { name: string; reason: string }[];
  recommendedIngredients: { name: string; reason: string }[];
  routineMorning: RoutineStep[];
  routineEvening: RoutineStep[];
  lifestyleTips: string[];
  disclaimer: string;
};

const severityColor = {
  mild: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  severe: 'bg-red-100 text-red-700 border-red-200',
};
const severityLabel = { mild: '경미', moderate: '중간', severe: '심함' };

const MedicineCard = ({ med }: { med: MedicineType }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Pill className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{med.name}</p>
          <p className="text-xs text-muted-foreground">{med.type} · {med.activeIngredient}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{med.priceRange}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-2.5">
          <div className="rounded-xl bg-primary/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-primary mb-1">왜 효과적인가요?</p>
            <p className="text-xs text-foreground leading-relaxed">{med.purpose}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/60 px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">사용 방법</p>
              <p className="text-xs text-foreground">{med.howToUse}</p>
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">횟수 / 기간</p>
              <p className="text-xs text-foreground">{med.frequency}<br />{med.duration}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{med.caution}</p>
          </div>
          <p className="text-xs text-muted-foreground">구매처: {med.purchaseLocation}</p>
        </div>
      )}
    </div>
  );
};

const SkinSolution = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [selected, setSelected] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SolutionResult | null>(null);
  const [error, setError] = useState('');
  const [morningOpen, setMorningOpen] = useState(true);
  const [eveningOpen, setEveningOpen] = useState(false);

  const toggleTrouble = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleAnalyze = async () => {
    if (selected.length === 0) {
      setError('트러블 종류를 1개 이상 선택해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const skinProfile = profile.skinType ? {
        skinType: profile.skinType,
        skinSensitivity: profile.skinSensitivity,
        specialCondition: profile.specialCondition,
        allergies: profile.allergies,
      } : null;

      const selectedLabels = selected.map(id => TROUBLE_TYPES.find(t => t.id === id)?.label || id);

      const { data, error: fnError } = await supabase.functions.invoke('skin-solution', {
        body: { troubleTypes: selectedLabels, location, duration, skinProfile },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as SolutionResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">트러블 솔루션</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {!result ? (
          <>
            {/* 트러블 선택 */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-bold text-foreground mb-3">어떤 트러블이 고민인가요? <span className="text-primary">(복수 선택 가능)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {TROUBLE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTrouble(t.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      selected.includes(t.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                    }`}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <div>
                      <p className={`text-xs font-semibold ${selected.includes(t.id) ? 'text-primary' : 'text-foreground'}`}>{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 위치 선택 */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-bold text-foreground mb-3">주로 어디에 생기나요? <span className="text-muted-foreground text-xs font-normal">(선택)</span></p>
              <div className="flex flex-wrap gap-2">
                {LOCATIONS.map(l => (
                  <button
                    key={l}
                    onClick={() => setLocation(loc => loc === l ? '' : l)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      location === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 선택 */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-bold text-foreground mb-3">얼마나 됐나요? <span className="text-muted-foreground text-xs font-normal">(선택)</span></p>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(dur => dur === d ? '' : d)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      duration === d ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {profile.skinType && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="text-sm">✅</span>
                <p className="text-xs text-primary">프로필 피부 정보({profile.skinType})가 분석에 자동 반영됩니다</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={loading || selected.length === 0}
              className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-primary disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z" />
                  </svg>
                  AI 분석 중...
                </span>
              ) : 'AI 솔루션 받기'}
            </button>
          </>
        ) : (
          <>
            {/* 결과 화면 */}

            {/* 병원 방문 경고 */}
            {result.needsDermatologist && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">피부과 방문을 권장합니다</p>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">{result.dermatologistReason || '현재 트러블 상태는 전문의 진료가 필요합니다.'}</p>
                </div>
              </div>
            )}

            {/* 원인 분석 */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">원인 분석</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityColor[result.severity]}`}>
                  {severityLabel[result.severity]}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.causeAnalysis}</p>
            </div>

            {/* 약국 의약품 추천 */}
            {result.otcMedicines?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">약국 의약품 추천</p>
                  <span className="text-xs text-muted-foreground">탭해서 자세히 보기</span>
                </div>
                {result.otcMedicines.map((med, i) => (
                  <MedicineCard key={i} med={med} />
                ))}
              </div>
            )}

            {/* 추천/기피 성분 */}
            <div className="grid grid-cols-2 gap-3">
              {result.recommendedIngredients?.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-bold text-green-700 mb-2">✅ 도움되는 성분</p>
                  <div className="space-y-1.5">
                    {result.recommendedIngredients.slice(0, 4).map((ing, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-green-800">{ing.name}</p>
                        <p className="text-xs text-green-700 leading-tight">{ing.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.avoidIngredients?.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-700 mb-2">❌ 피해야 할 성분</p>
                  <div className="space-y-1.5">
                    {result.avoidIngredients.slice(0, 4).map((ing, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-red-800">{ing.name}</p>
                        <p className="text-xs text-red-700 leading-tight">{ing.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 아침 루틴 */}
            {result.routineMorning?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                <button
                  onClick={() => setMorningOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-bold text-foreground">아침 스킨케어 루틴</p>
                  </div>
                  {morningOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {morningOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                    {result.routineMorning.map((step) => (
                      <div key={step.step} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{step.category}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{step.instruction}</p>
                          {step.keyIngredient && (
                            <span className="mt-1 inline-block rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
                              {step.keyIngredient}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 저녁 루틴 */}
            {result.routineEvening?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                <button
                  onClick={() => setEveningOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-bold text-foreground">저녁 스킨케어 루틴</p>
                  </div>
                  {eveningOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {eveningOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                    {result.routineEvening.map((step) => (
                      <div key={step.step} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{step.category}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{step.instruction}</p>
                          {step.keyIngredient && (
                            <span className="mt-1 inline-block rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">
                              {step.keyIngredient}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 생활 습관 팁 */}
            {result.lifestyleTips?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-foreground">생활 습관 팁</p>
                </div>
                <ul className="space-y-1.5">
                  {result.lifestyleTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 면책 고지 */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">{result.disclaimer}</p>
            </div>

            {/* 수분/보습 체크 */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-primary">성분 분석도 해보세요</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">지금 사용 중인 제품이 트러블에 영향을 주는지 확인해보세요.</p>
              <button
                onClick={() => navigate('/scan')}
                className="w-full rounded-xl border border-primary/30 py-2.5 text-xs font-semibold text-primary"
              >
                제품 성분 분석하기 →
              </button>
            </div>

            <button
              onClick={() => { setResult(null); setSelected([]); setLocation(''); setDuration(''); }}
              className="w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground shadow-card"
            >
              다시 분석하기
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SkinSolution;
