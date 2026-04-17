import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Sparkles, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  options: { value: string; label: string; emoji: string }[];
}

export const SKIN_TEST_QUESTIONS: Question[] = [
  {
    id: 'wash',
    text: '세안 후 아무것도 바르지 않으면\n30분 뒤 피부가 어떤가요?',
    options: [
      { value: 'tight', label: '당기고 건조함', emoji: '🏜️' },
      { value: 'oily', label: '번들번들 기름짐', emoji: '💧' },
      { value: 't_oily', label: 'T존만 기름지고 볼은 당김', emoji: '🔀' },
      { value: 'normal', label: '편안하고 촉촉', emoji: '✨' },
    ],
  },
  {
    id: 'pore',
    text: '모공 상태가 어떤가요?',
    options: [
      { value: 'invisible', label: '거의 보이지 않음', emoji: '🔍' },
      { value: 'nose_only', label: '코 주변만 넓음', emoji: '👃' },
      { value: 'wide', label: '전체적으로 넓은 편', emoji: '⭕' },
      { value: 'varies', label: '부위마다 다름', emoji: '🎯' },
    ],
  },
  {
    id: 'sensitivity',
    text: '새로운 화장품을 바르면 어떤가요?',
    options: [
      { value: 'fine', label: '대부분 잘 맞음', emoji: '👍' },
      { value: 'sometimes', label: '가끔 따갑거나 붉어짐', emoji: '😬' },
      { value: 'often', label: '자주 트러블이 남', emoji: '🔴' },
      { value: 'always', label: '거의 매번 반응이 옴', emoji: '⚠️' },
    ],
  },
  {
    id: 'trouble',
    text: '주로 어떤 피부 고민이 있나요?',
    options: [
      { value: 'dryness', label: '건조함·각질', emoji: '🍂' },
      { value: 'acne', label: '여드름·트러블', emoji: '😣' },
      { value: 'aging', label: '주름·탄력', emoji: '⏳' },
      { value: 'tone', label: '색소침착·톤', emoji: '🎨' },
      { value: 'redness', label: '홍조·민감', emoji: '🌹' },
      { value: 'none', label: '특별한 고민 없음', emoji: '😊' },
    ],
  },
  {
    id: 'moisture',
    text: '하루 중 피부 유수분 변화가 어떤가요?',
    options: [
      { value: 'always_dry', label: '하루종일 건조', emoji: '🏜️' },
      { value: 'afternoon_oily', label: '오후에 번들거림', emoji: '🌅' },
      { value: 'always_oily', label: '하루종일 기름짐', emoji: '💦' },
      { value: 'balanced', label: '대체로 균형적', emoji: '⚖️' },
    ],
  },
  {
    id: 'season',
    text: '계절에 따라 피부가 많이 변하나요?',
    options: [
      { value: 'a_lot', label: '많이 변함', emoji: '🌦️' },
      { value: 'a_little', label: '약간 변함', emoji: '🌤️' },
      { value: 'no_change', label: '거의 변하지 않음', emoji: '☀️' },
    ],
  },
];

// UserContext의 SKIN_CONDITIONS / SKIN_SENSITIVITIES 실제 value와 1:1 매칭되어야 함
export type SkinConditionValue = 'very_dry' | 'dry' | 'normal' | 'oily' | 'very_oily';
export type SkinSensitivityValue = 'very_sensitive' | 'sensitive' | 'normal' | 'resilient';

export interface DiagnosisResult {
  skinType: string;
  skinTypeEn: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
  summary: string;
  characteristics: string[];
  recommendations: string[];
  avoidIngredients: string[];
  score: number;
  skinCondition: SkinConditionValue;
  skinSensitivity: SkinSensitivityValue;
}

const mapCondition = (a: Record<string, string>): SkinConditionValue => {
  switch (a.moisture) {
    case 'always_dry': return 'very_dry';
    case 'afternoon_oily': return 'oily';
    case 'always_oily': return 'very_oily';
    case 'balanced': return 'normal';
    default: return a.wash === 'tight' ? 'dry' : 'normal';
  }
};

const mapSensitivity = (a: Record<string, string>): SkinSensitivityValue => {
  if (a.sensitivity === 'always') return 'very_sensitive';
  if (a.sensitivity === 'often') return 'sensitive';
  if (a.sensitivity === 'sometimes') return 'normal';
  return 'resilient';
};

const fallbackDiagnose = (a: Record<string, string>): DiagnosisResult => {
  // 점수 기반 매칭: 단일 문항 의존도를 줄이고 여러 답변을 종합.
  const score = { dry: 0, oily: 0, combination: 0, sensitive: 0, normal: 0 };
  if (a.wash === 'tight') score.dry += 2;
  if (a.wash === 'oily') score.oily += 2;
  if (a.wash === 't_oily') score.combination += 2;
  if (a.wash === 'normal') score.normal += 2;

  if (a.moisture === 'always_dry') score.dry += 2;
  if (a.moisture === 'always_oily') score.oily += 2;
  if (a.moisture === 'afternoon_oily') score.combination += 2;
  if (a.moisture === 'balanced') score.normal += 2;

  if (a.pore === 'wide') score.oily += 1;
  if (a.pore === 'nose_only') score.combination += 1;
  if (a.pore === 'invisible') { score.dry += 1; score.normal += 1; }
  if (a.pore === 'varies') score.combination += 1;

  if (a.sensitivity === 'often' || a.sensitivity === 'always') score.sensitive += 3;
  if (a.sensitivity === 'sometimes') score.sensitive += 1;

  if (a.trouble === 'dryness') score.dry += 1;
  if (a.trouble === 'acne') score.oily += 1;
  if (a.trouble === 'redness') score.sensitive += 2;
  if (a.trouble === 'aging') score.dry += 0.5;

  if (a.season === 'a_lot') score.sensitive += 0.5;

  // 민감성 임계치 우선: 민감도가 매우 높으면 민감성으로 확정
  let typeEn: DiagnosisResult['skinTypeEn'] = 'combination';
  if (score.sensitive >= 3) typeEn = 'sensitive';
  else {
    const ranked = Object.entries(score).sort((x, y) => y[1] - x[1]) as [DiagnosisResult['skinTypeEn'], number][];
    typeEn = ranked[0][0];
  }
  const typeMap: Record<DiagnosisResult['skinTypeEn'], string> = {
    dry: '건성', oily: '지성', combination: '복합성', sensitive: '민감성', normal: '중성',
  };
  const type = typeMap[typeEn];

  const characteristics: Record<string, string[]> = {
    '건성': ['유분 부족으로 각질 발생', '당김 증상 빈번', '잔주름 조기 발생 가능'],
    '지성': ['피지 분비 과다', '모공 확장 경향', '번들거림 지속'],
    '복합성': ['T존 유분·볼 건조', '부위별 상이한 관리 필요', '계절 영향 큼'],
    '민감성': ['외부 자극에 민감', '홍조·따가움 발생', '진정 케어 중요'],
    '중성': ['유수분 밸런스 양호', '트러블 적음', '기본 관리로 유지 가능'],
  };
  const recommendations: Record<string, string[]> = {
    '건성': ['고보습 크림 필수 사용', '세라마이드 성분 추천', '저자극 클렌저 사용'],
    '지성': ['가벼운 수분 젤 사용', '주 1~2회 BHA 각질 관리', '논코메도제닉 제품 선택'],
    '복합성': ['T존/U존 분리 관리', '가벼운 수분 에센스 전체 도포', '주기적 모공 관리'],
    '민감성': ['무향·무자극 제품 사용', '진정 성분 (시카·센텔라) 추천', '새 제품 패치 테스트 필수'],
    '중성': ['기본 보습 루틴 유지', '계절별 제품 미세 조정', '자외선 차단 꾸준히'],
  };
  const avoids: Record<string, string[]> = {
    '건성': ['알코올', 'SLS/SLES', '강한 레티놀'],
    '지성': ['미네랄 오일', '라놀린', '코코넛 오일'],
    '복합성': ['강한 계면활성제', '고농도 알코올'],
    '민감성': ['인공향료', '에탄올', '멘톨', '유칼립투스'],
    '중성': ['과도한 필링 성분'],
  };

  // 세부 근거 한 줄
  const reasonParts: string[] = [];
  if (a.wash === 'tight') reasonParts.push('세안 후 당김');
  if (a.wash === 'oily') reasonParts.push('세안 후 번들거림');
  if (a.wash === 't_oily') reasonParts.push('T존·볼 차이');
  if (a.sensitivity === 'often' || a.sensitivity === 'always') reasonParts.push('화장품 자극 잦음');
  if (a.moisture === 'afternoon_oily') reasonParts.push('오후 피지 증가');
  const reason = reasonParts.length > 0 ? ` (${reasonParts.slice(0, 2).join(', ')} 기준)` : '';

  return {
    skinType: type,
    skinTypeEn: typeEn,
    summary: `설문 결과 ${type} 피부로 진단됩니다${reason}. ${recommendations[type][0]}.`,
    characteristics: characteristics[type],
    recommendations: recommendations[type],
    avoidIngredients: avoids[type],
    score: type === '중성' ? 85 : type === '건성' ? 60 : type === '지성' ? 65 : type === '민감성' ? 55 : 70,
    skinCondition: mapCondition(a),
    skinSensitivity: mapSensitivity(a),
  };
};

interface Props {
  variant?: 'full' | 'compact';
  onResolved?: (result: DiagnosisResult, answers: Record<string, string>) => void;
  onRestart?: () => void;
  initialResult?: DiagnosisResult | null;
  /** 이전 진단 답변을 미리 채워 두고 시작 (재진단 시 사용자 편의) */
  initialAnswers?: Record<string, string> | null;
}

const SkinTypeDecider = ({
  variant = 'full', onResolved, onRestart, initialResult, initialAnswers,
}: Props) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(initialResult ?? null);

  const currentQ = SKIN_TEST_QUESTIONS[step];
  const isLastStep = step === SKIN_TEST_QUESTIONS.length - 1;

  const selectAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }));
  };

  const runDiagnosis = useCallback(async () => {
    setDiagnosing(true);
    try {
      const prompt = `사용자의 피부 설문 결과를 분석해서 피부 타입을 진단해주세요.

설문 답변:
- 세안 후 30분: ${answers.wash}
- 모공 상태: ${answers.pore}
- 새 화장품 반응: ${answers.sensitivity}
- 주요 고민: ${answers.trouble}
- 유수분 변화: ${answers.moisture}
- 계절 변화: ${answers.season}

다음 JSON으로 반환:
{
  "skinType": "건성|지성|복합성|민감성|중성 중 1개",
  "skinTypeEn": "dry|oily|combination|sensitive|normal",
  "summary": "진단 결과 요약 (2-3문장, 설문 근거 1개 이상 포함)",
  "characteristics": ["이 피부 타입의 특징 3개 (각 15자 이내)"],
  "recommendations": ["케어 추천 3개 (각 20자 이내)"],
  "avoidIngredients": ["피해야 할 성분 3~5개"],
  "score": 피부 건강 점수 (0-100),
  "skinCondition": "very_dry|dry|normal|slightly_oily|oily 중 1개",
  "suggestedSensitivity": "low|normal|high|very_high 중 1개"
}`;

      const { data, error } = await supabase.functions.invoke('product-search', {
        body: { query: prompt, skinDiagnosis: true },
      });

      // AI 응답이 왔더라도 필수 필드 누락 시 fallback으로 보강.
      const fb = fallbackDiagnose(answers);
      const resolved: DiagnosisResult = (!error && data?.skinType)
        ? {
            ...fb,
            ...(data as Partial<DiagnosisResult>),
            // 매핑 값은 항상 우리 enum과 호환되도록 fallback 우선 사용
            skinCondition: fb.skinCondition,
            skinSensitivity: fb.skinSensitivity,
          }
        : fb;
      setResult(resolved);
      onResolved?.(resolved, answers);
    } catch {
      const resolved = fallbackDiagnose(answers);
      setResult(resolved);
      onResolved?.(resolved, answers);
    } finally {
      setDiagnosing(false);
    }
  }, [answers, onResolved]);

  const handleNext = () => {
    if (!answers[currentQ.id]) return;
    if (isLastStep) runDiagnosis();
    else setStep(s => s + 1);
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    onRestart?.();
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-primary' : s >= 40 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = (s: number) =>
    s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-primary' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';

  const progress = ((step + (result ? 1 : 0)) / SKIN_TEST_QUESTIONS.length) * 100;

  return (
    <div className="space-y-4">
      {/* 진행 바 */}
      {!result && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${diagnosing ? 'bg-amber-400' : 'bg-primary'} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{step + 1}/{SKIN_TEST_QUESTIONS.length}</span>
        </div>
      )}

      {/* 질문 */}
      {!result && !diagnosing && currentQ && (
        <div className="space-y-4">
          <p className="text-base font-bold text-foreground whitespace-pre-line leading-relaxed text-center">
            {currentQ.text}
          </p>
          <div className="space-y-2">
            {currentQ.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => selectAnswer(opt.value)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  answers[currentQ.id] === opt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-white hover:bg-neutral-50'
                }`}
              >
                <span className="text-xl shrink-0">{opt.emoji}</span>
                <span className={`text-sm font-medium ${answers[currentQ.id] === opt.value ? 'text-primary' : 'text-foreground'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!answers[currentQ.id]}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {isLastStep ? <><Sparkles className="h-4 w-4" />진단하기</> : <>다음<ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* 진단 중 */}
      {diagnosing && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-foreground">AI가 피부를 분석하고 있어요</p>
          <p className="text-xs text-muted-foreground">잠시만 기다려주세요...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-card">
            <p className="text-xs text-muted-foreground mb-2">내 피부 건강 점수</p>
            <div className={`text-4xl font-black ${scoreColor(result.score)}`}>{result.score}</div>
            <div className="w-full bg-neutral-100 rounded-full h-2 mt-3 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${scoreBg(result.score)}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1">
              <span className="text-sm font-bold text-primary">{result.skinType}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.summary}</p>
          </div>

          {variant === 'full' && (
            <>
              <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
                <p className="text-sm font-bold text-foreground mb-2">내 피부 특징</p>
                <div className="space-y-1.5">
                  {result.characteristics.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-card">
                <p className="text-sm font-bold text-green-800 mb-2">맞춤 케어 추천</p>
                <div className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      <span className="text-xs text-green-800">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-card">
                <p className="text-sm font-bold text-red-800 mb-2">피해야 할 성분</p>
                <div className="flex flex-wrap gap-1">
                  {result.avoidIngredients.map((a, i) => (
                    <span key={i} className="rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleRestart}
            className="w-full rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground"
          >
            다시 진단하기
          </button>
        </div>
      )}
    </div>
  );
};

export default SkinTypeDecider;
