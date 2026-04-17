import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import RoutineSafetyCard from '@/components/RoutineSafetyCard';
import {
  Sun, Moon, Package, ChevronRight, BookOpen,
  Layers, TrendingUp, Plus, Sparkles, Loader2,
  TrendingDown, Minus, Brain, RefreshCw, Mic, MicOff,
} from 'lucide-react';

// ─── 타입 ─────────────────────────────────────────────────────────────────────
interface DiaryEntry {
  id: string;
  date: string;
  skin_score: number;
  trouble_spots: string[];
  notes: string;
}

interface CabinetItem {
  id: string;
  product_name: string;
  is_morning: boolean;
  is_evening: boolean;
  step_order: number;
}

type MySkinTab = 'diary' | 'routine' | 'cabinet';

const SCORE_EMOJI: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😊', 5: '😄' };
const SCORE_COLOR: Record<number, string> = {
  1: 'border-red-400 bg-red-50 text-red-700',
  2: 'border-orange-400 bg-orange-50 text-orange-700',
  3: 'border-yellow-400 bg-yellow-50 text-yellow-700',
  4: 'border-green-400 bg-green-50 text-green-700',
  5: 'border-primary bg-primary/10 text-primary',
};
const TROUBLE_OPTIONS = ['건조', '트러블', '홍조', '번들거림', '각질', '가려움', '붓기', '칙칙함'];

const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];
const todayStr = toYYYYMMDD(new Date());

const MySkin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUser();

  const [activeTab, setActiveTab] = useState<MySkinTab>('diary');

  // ─── 일기 상태 ───────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [skinScore, setSkinScore] = useState(3);
  const [troubleSpots, setTroubleSpots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [savingDiary, setSavingDiary] = useState(false);
  const [diaryMode, setDiaryMode] = useState<'view' | 'edit'>('view');
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);

  // ─── 보이스 입력 ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ─── 보관함 상태 ─────────────────────────────────────────────────────────────
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [cabinetLoading, setCabinetLoading] = useState(true);

  // ─── AI 코치 상태 ─────────────────────────────────────────────────────────────
  interface CoachInsight { icon: string; title: string; body: string; }
  interface CoachReport {
    greeting: string;
    skinStatus: string;
    keyInsights: CoachInsight[];
    weeklyAction: { title: string; actions: string[] };
    productAdvice: string;
    encouragement: string;
    dataQuality: 'sufficient' | 'insufficient';
  }
  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState(false);

  // ─── 데이터 로드 ─────────────────────────────────────────────────────────────
  const loadDiary = useCallback(async () => {
    if (!user) return;
    const month = new Date();
    const from = toYYYYMMDD(new Date(month.getFullYear(), month.getMonth(), 1));
    const to = toYYYYMMDD(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const { data } = await supabase
      .from('skin_diary')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    const list = (data ?? []) as DiaryEntry[];
    setEntries(list);
    const te = list.find(e => e.date === todayStr) ?? null;
    setTodayEntry(te);
    if (te) { setSkinScore(te.skin_score); setTroubleSpots(te.trouble_spots ?? []); setNotes(te.notes ?? ''); }
  }, [user]);

  const loadCabinet = useCallback(async () => {
    if (!user) return;
    setCabinetLoading(true);
    const { data } = await supabase
      .from('my_cabinet' as never)
      .select('id, product_name, is_morning, is_evening, step_order')
      .eq('user_id', user.id)
      .order('step_order', { ascending: true });
    setCabinetItems((data as CabinetItem[]) ?? []);
    setCabinetLoading(false);
  }, [user]);

  useEffect(() => { loadDiary(); loadCabinet(); }, [loadDiary, loadCabinet]);

  // ─── AI 코치 로드 ─────────────────────────────────────────────────────────────
  const fetchCoachReport = useCallback(async () => {
    if (!user) return;
    setCoachLoading(true);
    setCoachError(false);
    try {
      const [{ data: diaryData }, { data: analysisData }, { data: cabinetData }] = await Promise.all([
        supabase.from('skin_diary').select('date, skin_score, trouble_spots, notes')
          .eq('user_id', user.id).order('date', { ascending: false }).limit(14),
        supabase.from('analysis_history').select('product_name, product_brand, overall_grade, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('my_cabinet' as never).select('product_name, is_morning, is_evening')
          .eq('user_id', user.id),
      ]);
      const { data } = await supabase.functions.invoke('skin-coach', {
        body: {
          diaryEntries: (diaryData ?? []).map((d: { date: string; skin_score: number; trouble_spots: string[]; notes: string }) => ({
            date: d.date, score: d.skin_score, troubles: d.trouble_spots ?? [], notes: d.notes,
          })),
          analysisHistory: analysisData ?? [],
          cabinetItems: (cabinetData ?? []).map((c: { product_name: string; is_morning: boolean; is_evening: boolean }) => ({
            product_name: c.product_name, is_morning: c.is_morning, is_evening: c.is_evening,
          })),
          userProfile: {
            skinType: profile.skinType,
            skinConcerns: profile.skinConcerns,
            skinSensitivity: profile.skinSensitivity,
            ageGroup: profile.ageGroup,
            avoidIngredients: profile.avoidIngredients,
            skinGoals: profile.skinGoals,
          },
          period: 'weekly',
        },
      });
      if (data?.greeting) setCoachReport(data as CoachReport);
      else setCoachError(true);
    } catch { setCoachError(true); }
    finally { setCoachLoading(false); }
  }, [user, profile]); // cabinetItems 의존성 제거 → 함수 내부에서 직접 조회

  // 일기 탭으로 이동할 때 AI 코치 자동 로드 (첫 번째만)
  useEffect(() => {
    if (activeTab === 'diary' && !coachReport && !coachLoading && !coachError && entries.length > 0) {
      fetchCoachReport();
    }
  }, [activeTab, coachReport, coachLoading, coachError, entries.length, fetchCoachReport]);

  // ─── 일기 저장 ───────────────────────────────────────────────────────────────
  const handleSaveDiary = async () => {
    if (!user) return;
    setSavingDiary(true);
    const payload = { user_id: user.id, date: todayStr, skin_score: skinScore, trouble_spots: troubleSpots, notes };
    const { error } = todayEntry
      ? await supabase.from('skin_diary').update({ skin_score: skinScore, trouble_spots: troubleSpots, notes }).eq('id', todayEntry.id)
      : await supabase.from('skin_diary').insert(payload);
    if (!error) {
      await loadDiary();
      setDiaryMode('view');
      fetchAiComment(skinScore, troubleSpots);
    }
    setSavingDiary(false);
  };

  // ─── 보이스 입력 핸들러 ────────────────────────────────────────────────────────
  const toggleVoiceInput = () => {
    const SpeechRecognitionAPI = (window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('이 브라우저에서는 음성 입력을 지원하지 않아요. Chrome 또는 Edge를 사용해주세요.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setNotes(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ─── AI 코멘트 ───────────────────────────────────────────────────────────────
  const fetchAiComment = async (score: number, troubles: string[]) => {
    setLoadingComment(true);
    setAiComment(null);
    try {
      const skinType = profile.skinType ?? '피부타입 미설정';
      const { data } = await supabase.functions.invoke('diary-insights', {
        body: {
          quickComment: true,
          score,
          troubles,
          skinType,
          diaryEntries: entries.slice(0, 7),
          recentAnalyses: [],
        },
      });
      if (data?.quickComment) setAiComment(data.quickComment);
    } catch { /* 실패 시 조용히 무시 */ }
    finally { setLoadingComment(false); }
  };

  // ─── 달력 관련 ───────────────────────────────────────────────────────────────
  const month = new Date();
  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const entryMap = Object.fromEntries(entries.map(e => [e.date, e]));

  const morningItems = cabinetItems.filter(i => i.is_morning).sort((a, b) => a.step_order - b.step_order);
  const eveningItems = cabinetItems.filter(i => i.is_evening).sort((a, b) => a.step_order - b.step_order);

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-border safe-top">
        <div className="px-4 pt-4 pb-1">
          <h1 className="text-base font-bold text-foreground">내 피부</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.skinType ? `${profile.skinType} 피부` : '피부 트래킹 & 루틴 관리'}
          </p>
        </div>

        {/* 탭 */}
        <div className="flex px-4 pb-0 gap-0">
          {([
            { key: 'diary',   label: '피부 일기', icon: BookOpen },
            { key: 'routine', label: '루틴 체커', icon: Layers },
            { key: 'cabinet', label: '보관함',    icon: Package },
          ] as { key: MySkinTab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────── 피부 일기 탭 ─────────── */}
      {activeTab === 'diary' && (
        <div className="px-4 pt-4 space-y-4">

          {/* 오늘 피부 상태 — 빠른 입력 카드 */}
          <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-bold text-foreground">오늘 피부 상태</p>
              {todayEntry && diaryMode === 'view' && (
                <button
                  onClick={() => setDiaryMode('edit')}
                  className="text-xs text-primary font-semibold"
                >
                  수정
                </button>
              )}
            </div>

            {diaryMode === 'view' && todayEntry ? (
              // 저장된 오늘 기록 표시
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{SCORE_EMOJI[todayEntry.skin_score]}</span>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SCORE_COLOR[todayEntry.skin_score]}`}>
                      {todayEntry.skin_score}점
                    </span>
                    {todayEntry.trouble_spots?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {todayEntry.trouble_spots.map(t => (
                          <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    {todayEntry.notes && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{todayEntry.notes}</p>}
                  </div>
                </div>

                {/* AI 코멘트 */}
                {(loadingComment || aiComment) && (
                  <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2.5">
                    {loadingComment ? (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" /> AI 코멘트 생성 중...
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-primary leading-relaxed">{aiComment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : diaryMode === 'edit' ? (
              // 입력 폼 (edit 모드에서만 표시)
              <div className="px-4 pb-4 space-y-3">
                {/* 점수 선택 — 이모지 5개 */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSkinScore(s)}
                      className={`flex-1 flex flex-col items-center rounded-xl border py-2 transition-all ${
                        skinScore === s ? SCORE_COLOR[s] : 'border-border text-muted-foreground'
                      }`}
                    >
                      <span className="text-xl">{SCORE_EMOJI[s]}</span>
                      <span className="text-xs mt-0.5 font-semibold">{s}점</span>
                    </button>
                  ))}
                </div>

                {/* 트러블 태그 */}
                <div className="flex flex-wrap gap-1.5">
                  {TROUBLE_OPTIONS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTroubleSpots(prev =>
                        prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                      )}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        troubleSpots.includes(t)
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-muted-foreground bg-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* 메모 */}
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="오늘 피부에 대해 메모해두세요 (선택)"
                    className="w-full rounded-xl border border-border bg-neutral-50 px-3 py-2.5 pr-10 text-xs resize-none outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    title={isRecording ? '녹음 중 — 탭해서 중지' : '음성으로 입력'}
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-neutral-200 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <button
                  onClick={handleSaveDiary}
                  disabled={savingDiary}
                  className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {savingDiary ? '저장 중...' : todayEntry ? '수정 완료' : '오늘 피부 기록'}
                </button>
              </div>
            ) : null}

            {diaryMode === 'view' && !todayEntry && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">오늘 피부 상태를 기록해보세요</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSkinScore(s); setDiaryMode('edit'); }}
                      className="flex-1 flex flex-col items-center rounded-xl border border-border py-2 hover:border-primary/50 active:scale-95 transition-all"
                    >
                      <span className="text-xl">{SCORE_EMOJI[s]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 이번 달 달력 */}
          <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">{year}년 {mon + 1}월 기록</p>
              <button
                onClick={() => navigate('/diary')}
                className="flex items-center gap-0.5 text-xs text-primary font-medium"
              >
                전체 보기 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const dateStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const entry = entryMap[dateStr];
                  const isToday = dateStr === todayStr;
                  return (
                    <button
                      key={d}
                      onClick={() => navigate('/diary')}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        isToday ? 'ring-2 ring-primary ring-offset-1' : ''
                      } ${entry ? '' : 'hover:bg-neutral-50'}`}
                    >
                      {entry ? (
                        <>
                          <span className="text-base leading-none">{SCORE_EMOJI[entry.skin_score]}</span>
                          <span className="text-[8px] text-muted-foreground">{d}</span>
                        </>
                      ) : (
                        <span className={isToday ? 'text-primary font-bold' : 'text-muted-foreground'}>{d}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI 인사이트 / 타임라인 링크 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/diary')}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 text-left shadow-card"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">AI 인사이트</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {entries.length >= 3 ? `${entries.length}일 데이터 기반 분석` : '3일 이상 기록 후 확인'}
              </p>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </button>
            <button
              onClick={() => navigate('/timeline')}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 text-left shadow-card"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-foreground">피부 타임라인</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">장기 변화 추세 시각화</p>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </button>
          </div>

          {/* ── 주간 피부 리포트 ── */}
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">주간 피부 리포트</span>
              </div>
              <button
                onClick={fetchCoachReport}
                disabled={coachLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${coachLoading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>

            {coachLoading ? (
              <div className="flex items-center gap-2 px-4 py-5 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                내 데이터를 분석 중이에요...
              </div>
            ) : coachError ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground mb-2">분석을 불러오지 못했어요</p>
                <button onClick={fetchCoachReport} className="text-xs text-primary font-semibold">다시 시도</button>
              </div>
            ) : coachReport ? (
              <div className="px-4 py-4 space-y-4">
                {/* 인사 + 피부 상태 */}
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">{coachReport.greeting}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{coachReport.skinStatus}</p>
                </div>

                {/* 주요 인사이트 */}
                {coachReport.keyInsights?.length > 0 && (
                  <div className="space-y-2">
                    {coachReport.keyInsights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
                        <span className="text-base">{ins.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{ins.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ins.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 이번 주 집중 케어 */}
                {coachReport.weeklyAction && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                    <p className="text-xs font-bold text-primary mb-2">{coachReport.weeklyAction.title}</p>
                    <ul className="space-y-1">
                      {coachReport.weeklyAction.actions?.map((a, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 응원 메시지 */}
                <p className="text-xs text-muted-foreground text-center">{coachReport.encouragement}</p>

                {coachReport.dataQuality === 'insufficient' && (
                  <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg py-1.5">
                    💡 일기를 더 기록하면 더 정확한 분석이 가능해요
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground">일기를 기록하면 AI 코치가 맞춤 분석을 드려요</p>
                <button onClick={fetchCoachReport} className="mt-2 text-xs text-primary font-semibold">
                  분석 요청하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── 루틴 체커 탭 ─────────── */}
      {activeTab === 'routine' && (
        <div className="px-4 pt-4 space-y-4">
          {/* 루틴 안전도 카드 */}
          <RoutineSafetyCard />

          {/* 루틴 상세 관리 바로가기 */}
          <button
            onClick={() => navigate('/routine')}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">루틴 성분 궁합 분석</p>
              <p className="text-xs text-muted-foreground mt-0.5">아침·저녁 루틴 제품 추가 및 AI 분석</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {/* 아침/저녁 루틴 미리보기 */}
          {(morningItems.length > 0 || eveningItems.length > 0) ? (
            <div className="grid grid-cols-2 gap-3">
              {/* 아침 */}
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">아침</span>
                  </div>
                  <span className="text-xs font-bold text-yellow-600">{morningItems.length}개</span>
                </div>
                <div className="space-y-1">
                  {morningItems.slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span className="w-3 text-xs font-bold text-yellow-400 shrink-0">{i + 1}</span>
                      <span className="text-xs text-yellow-800 truncate">{item.product_name}</span>
                    </div>
                  ))}
                  {morningItems.length > 5 && <p className="text-xs text-yellow-400">+{morningItems.length - 5}개 더</p>}
                </div>
              </div>
              {/* 저녁 */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700">저녁</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">{eveningItems.length}개</span>
                </div>
                <div className="space-y-1">
                  {eveningItems.slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span className="w-3 text-xs font-bold text-indigo-400 shrink-0">{i + 1}</span>
                      <span className="text-xs text-indigo-800 truncate">{item.product_name}</span>
                    </div>
                  ))}
                  {eveningItems.length > 5 && <p className="text-xs text-indigo-400">+{eveningItems.length - 5}개 더</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white py-8 text-center">
              <p className="text-sm text-muted-foreground">아직 루틴 제품이 없어요</p>
              <button
                onClick={() => navigate('/routine')}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                루틴 설정하러 가기
              </button>
            </div>
          )}

          {/* 트러블 솔루션 바로가기 */}
          <button
            onClick={() => navigate('/skin-solution')}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">트러블 솔루션</p>
              <p className="text-xs text-muted-foreground">피부 트러블 유형별 케어 & 약품 추천</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* ─────────── 보관함 탭 ─────────── */}
      {activeTab === 'cabinet' && (
        <div className="px-4 pt-4 space-y-4">
          {/* 보관함 바로가기 배너 */}
          <button
            onClick={() => navigate('/cabinet')}
            className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">내 화장품 보관함</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {cabinetLoading ? '로딩 중...' : `${cabinetItems.length}개 제품 · 날씨 맞춤 루틴 추천`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
          </button>

          {/* 아침/저녁 요약 */}
          {!cabinetLoading && (morningItems.length > 0 || eveningItems.length > 0) ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">아침 루틴</span>
                  </div>
                  <span className="text-xs text-yellow-600 font-bold">{morningItems.length}개</span>
                </div>
                {morningItems.slice(0, 4).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 text-xs font-bold text-yellow-400 shrink-0">{i + 1}</span>
                    <span className="text-xs text-yellow-800 truncate">{item.product_name}</span>
                  </div>
                ))}
                {morningItems.length > 4 && <p className="text-xs text-yellow-400">+{morningItems.length - 4}개</p>}
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700">저녁 루틴</span>
                  </div>
                  <span className="text-xs text-indigo-600 font-bold">{eveningItems.length}개</span>
                </div>
                {eveningItems.slice(0, 4).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 text-xs font-bold text-indigo-400 shrink-0">{i + 1}</span>
                    <span className="text-xs text-indigo-800 truncate">{item.product_name}</span>
                  </div>
                ))}
                {eveningItems.length > 4 && <p className="text-xs text-indigo-400">+{eveningItems.length - 4}개</p>}
              </div>
            </div>
          ) : !cabinetLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-white py-8 text-center">
              <p className="text-sm text-muted-foreground">보관함이 비어있어요</p>
              <button
                onClick={() => navigate('/cabinet')}
                className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground mx-auto"
              >
                <Plus className="h-3.5 w-3.5" /> 제품 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-neutral-200 animate-pulse" />)}
            </div>
          )}

          {/* 성분 블랙리스트 바로가기 */}
          <button
            onClick={() => navigate('/blacklist')}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <Minus className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">성분 블랙리스트</p>
              <p className="text-xs text-muted-foreground">내 피부에 맞지 않는 성분 자동 경보</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MySkin;
