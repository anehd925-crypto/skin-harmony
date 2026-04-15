import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, ChevronRight, BookMarked, Sparkles, Loader2,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Lightbulb, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DiaryEntry {
  id: string;
  date: string;
  skin_score: number;
  trouble_spots: string[];
  notes: string;
}

interface InsightItem {
  type: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  actionable: string;
}

interface DiaryInsight {
  overallTrend: 'improving' | 'stable' | 'worsening';
  averageScore: number;
  insights: InsightItem[];
  bestPeriod?: { startDate: string; endDate: string; avgScore: number; possibleReason: string };
  worstPeriod?: { startDate: string; endDate: string; avgScore: number; possibleReason: string };
  recommendations: string[];
  summary: string;
}

const TROUBLE_OPTIONS = ['건조', '트러블', '홍조', '번들거림', '각질', '가려움', '붓기', '칙칙함'];

const SCORE_CONFIG = [
  { score: 1, emoji: '😞', label: '매우 나쁨', color: 'border-destructive bg-destructive/10 text-destructive' },
  { score: 2, emoji: '😐', label: '나쁨',     color: 'border-orange-400 bg-orange-50 text-orange-600' },
  { score: 3, emoji: '🙂', label: '보통',     color: 'border-yellow-400 bg-yellow-50 text-yellow-600' },
  { score: 4, emoji: '😊', label: '좋음',     color: 'border-green-400 bg-green-50 text-green-600' },
  { score: 5, emoji: '😄', label: '매우 좋음', color: 'border-primary bg-primary/10 text-primary' },
];

const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];
const today = toYYYYMMDD(new Date());

const Diary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // 입력 상태
  const [skinScore, setSkinScore] = useState(3);
  const [troubleSpots, setTroubleSpots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // 인사이트
  const [insight, setInsight] = useState<DiaryInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const from = toYYYYMMDD(new Date(year, month, 1));
    const to = toYYYYMMDD(new Date(year, month + 1, 0));

    const { data } = await supabase
      .from('skin_diary')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });

    setEntries(data || []);
  }, [user, currentMonth]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const openNewEntry = (date: string) => {
    const existing = entries.find(e => e.date === date);
    if (existing) {
      setEditEntry(existing);
      setSkinScore(existing.skin_score);
      setTroubleSpots(existing.trouble_spots || []);
      setNotes(existing.notes || '');
    } else {
      setEditEntry(null);
      setSkinScore(3);
      setTroubleSpots([]);
      setNotes('');
    }
    setSelectedDate(date);
    setShowEntryModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      date: selectedDate,
      skin_score: skinScore,
      trouble_spots: troubleSpots,
      notes,
    };

    const { error } = editEntry
      ? await supabase.from('skin_diary').update({ skin_score: skinScore, trouble_spots: troubleSpots, notes }).eq('id', editEntry.id)
      : await supabase.from('skin_diary').insert(payload);

    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '저장 완료', description: '피부 일기가 저장되었습니다.' });
      setShowEntryModal(false);
      await loadEntries();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editEntry) return;
    const { error } = await supabase.from('skin_diary').delete().eq('id', editEntry.id);
    if (!error) {
      setShowEntryModal(false);
      await loadEntries();
    }
  };

  const handleGetInsight = async () => {
    if (!user) return;
    if (entries.length < 3) {
      toast({ title: '안내', description: '인사이트 분석을 위해 최소 3일 이상의 일기가 필요합니다.' });
      return;
    }

    setLoadingInsight(true);
    setInsight(null);

    const { data: allEntries } = await supabase
      .from('skin_diary')
      .select('date, skin_score, trouble_spots, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);

    const { data: analyses } = await supabase
      .from('analysis_history')
      .select('created_at, product_name, product_brand, overall_grade, result')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentAnalyses = (analyses || []).map(a => ({
      date: a.created_at?.split('T')[0] || '',
      product_name: a.product_name || '',
      product_brand: a.product_brand || '',
      overall_grade: a.overall_grade || '',
      key_ingredients: ((a.result as { keyIngredients?: { name: string }[] })?.keyIngredients || []).map((k) => k.name).slice(0, 5),
    }));

    const { data, error } = await supabase.functions.invoke('diary-insights', {
      body: { diaryEntries: allEntries || [], recentAnalyses },
    });

    if (error) {
      toast({ title: '오류', description: '인사이트 분석에 실패했습니다.', variant: 'destructive' });
    } else {
      setInsight(data as DiaryInsight);
      setShowInsight(true);
    }

    setLoadingInsight(false);
  };

  // 달력 렌더링
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const entryMap = Object.fromEntries(entries.map(e => [e.date, e]));

  const getScoreStyle = (score: number) => {
    const cfg = SCORE_CONFIG.find(c => c.score === score);
    return cfg ? cfg.color.split(' ')[0] : 'border-border';
  };

  const trendIcon = {
    improving: <TrendingUp className="h-4 w-4 text-success" />,
    stable: <Minus className="h-4 w-4 text-muted-foreground" />,
    worsening: <TrendingDown className="h-4 w-4 text-destructive" />,
  };

  const confidenceBadge = {
    high: 'bg-primary/10 text-primary',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/history')} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">피부 일기</h1>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGetInsight}
          disabled={loadingInsight || entries.length < 3}
          className="rounded-full text-xs"
        >
          {loadingInsight ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          AI 인사이트
        </Button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <ChevronLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
          <p className="text-sm font-semibold">
            {year}년 {month + 1}월
          </p>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* 달력 그리드 */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-border">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-destructive' : i === 6 ? 'text-primary' : 'text-muted-foreground'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-12" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const entry = entryMap[dateStr];
              const isToday = dateStr === today;
              const dayOfWeek = (firstDay + i) % 7;

              return (
                <button
                  key={d}
                  onClick={() => openNewEntry(dateStr)}
                  className={`relative flex flex-col items-center justify-center h-12 text-xs transition-colors hover:bg-accent ${
                    isToday ? 'font-bold' : ''
                  }`}
                >
                  <span className={`text-[11px] mb-0.5 ${
                    isToday ? 'text-primary' :
                    dayOfWeek === 0 ? 'text-destructive' :
                    dayOfWeek === 6 ? 'text-primary/70' :
                    'text-foreground'
                  }`}>
                    {d}
                  </span>
                  {entry ? (
                    <span className={`text-base leading-none`}>
                      {SCORE_CONFIG.find(c => c.score === entry.skin_score)?.emoji}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40">+</span>
                  )}
                  {isToday && (
                    <span className="absolute top-0.5 right-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 이번 달 통계 */}
        {entries.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">{month + 1}월 피부 현황</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {(entries.reduce((s, e) => s + e.skin_score, 0) / entries.length).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">평균 점수</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{entries.length}일</p>
                <p className="text-xs text-muted-foreground">기록 일수</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {entries.filter(e => e.skin_score >= 4).length}일
                </p>
                <p className="text-xs text-muted-foreground">좋은 날</p>
              </div>
            </div>
          </div>
        )}

        {entries.length < 3 && (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
            <BookMarked className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">날짜를 탭해서 피부 상태를 기록해보세요</p>
            <p className="text-xs text-muted-foreground mt-1">3일 이상 기록하면 AI 인사이트를 받을 수 있어요</p>
          </div>
        )}
      </div>

      {/* 일기 입력 모달 */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowEntryModal(false)}>
          <div
            className="w-full max-h-[90vh] rounded-t-2xl bg-background border-t border-border overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border px-5 py-3 bg-background">
              <div>
                <p className="text-sm font-semibold">피부 일기</p>
                <p className="text-xs text-muted-foreground">{selectedDate}</p>
              </div>
              <div className="flex items-center gap-2">
                {editEntry && (
                  <button onClick={handleDelete} className="text-xs text-destructive">삭제</button>
                )}
                <button onClick={() => setShowEntryModal(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* 피부 점수 */}
              <div>
                <p className="text-sm font-semibold mb-3">오늘 피부는 어때요?</p>
                <div className="flex gap-2 justify-between">
                  {SCORE_CONFIG.map(cfg => (
                    <button
                      key={cfg.score}
                      onClick={() => setSkinScore(cfg.score)}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-all ${
                        skinScore === cfg.score ? cfg.color : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      <span className="text-xl">{cfg.emoji}</span>
                      <span className="text-[10px] font-medium">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 트러블 부위 */}
              <div>
                <p className="text-sm font-semibold mb-2">트러블 (복수 선택)</p>
                <div className="flex flex-wrap gap-2">
                  {TROUBLE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTroubleSpots(prev =>
                        prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                      )}
                      className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                        troubleSpots.includes(opt)
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border bg-card text-muted-foreground hover:border-destructive/40'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <p className="text-sm font-semibold mb-2">메모 (선택)</p>
                <textarea
                  className="w-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:border-primary leading-relaxed"
                  rows={3}
                  placeholder="오늘 피부 상태, 사용한 제품, 특이사항 등을 자유롭게 기록해요"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl gradient-primary text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장하기'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI 인사이트 모달 */}
      {showInsight && insight && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowInsight(false)}>
          <div
            className="w-full max-h-[90vh] rounded-t-2xl bg-background border-t border-border overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border px-5 py-3 bg-background">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">AI 피부 인사이트</p>
              </div>
              <button onClick={() => setShowInsight(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* 트렌드 요약 */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  {trendIcon[insight.overallTrend]}
                  <p className="text-sm font-semibold text-foreground">
                    {insight.overallTrend === 'improving' && '피부 상태가 개선되고 있어요'}
                    {insight.overallTrend === 'stable' && '피부 상태가 안정적이에요'}
                    {insight.overallTrend === 'worsening' && '피부 상태에 주의가 필요해요'}
                  </p>
                  <span className="ml-auto text-sm font-bold text-primary">{insight.averageScore?.toFixed(1)}/5.0</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.summary}</p>
              </div>

              {/* 인사이트 카드들 */}
              {insight.insights?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">발견된 패턴</p>
                  {insight.insights.map((ins, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{ins.title}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confidenceBadge[ins.confidence]}`}>
                              {ins.confidence === 'high' ? '확실' : ins.confidence === 'medium' ? '가능성' : '추정'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
                        </div>
                      </div>
                      {ins.actionable && (
                        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                          <p className="text-xs text-primary">{ins.actionable}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 권장사항 */}
              {insight.recommendations?.length > 0 && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <p className="text-xs font-semibold text-success">권장사항</p>
                  </div>
                  <ul className="space-y-1.5">
                    {insight.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-success shrink-0">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Diary;
