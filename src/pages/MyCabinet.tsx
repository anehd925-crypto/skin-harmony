import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, Plus, Trash2, Sun, Moon, Pencil,
  Package, X, Check, ChevronDown, ChevronUp,
  FlaskConical, Layers, Search, Sparkles, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── 타입 ──────────────────────────────────────────────────────────────────
interface CabinetItem {
  id: string;
  product_name: string;
  product_brand: string | null;
  category: string;
  step_order: number;
  is_morning: boolean;
  is_evening: boolean;
  is_opened: boolean;
  opened_at: string | null;
  pao_months: number | null;
  notes: string | null;
  analysis_history_id: string | null;
}

interface HistoryItem {
  id: string;
  product_name: string;
  product_brand: string;
  ingredients_text: string;
}

// ─── 카테고리 (클렌징 추가) ─────────────────────────────────────────────────
type CategoryKey =
  | 'cleansing_water' | 'cleansing_oil' | 'cleansing_foam'
  | 'skincare' | 'suncare' | 'treatment' | 'makeup' | 'body' | 'hair';

interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
  group: 'cleansing' | 'skincare' | 'other';
  color: string;
}

const CATEGORIES: Category[] = [
  // 클렌징
  { key: 'cleansing_water', label: '클렌징워터', emoji: '💧', group: 'cleansing', color: 'bg-sky-100 text-sky-700' },
  { key: 'cleansing_oil',   label: '클렌징오일',  emoji: '🫙', group: 'cleansing', color: 'bg-amber-100 text-amber-700' },
  { key: 'cleansing_foam',  label: '클렌징폼',    emoji: '🫧', group: 'cleansing', color: 'bg-teal-100 text-teal-700' },
  // 기초 스킨케어
  { key: 'skincare',   label: '스킨케어',   emoji: '🧴', group: 'skincare', color: 'bg-blue-100 text-blue-700' },
  { key: 'suncare',    label: '선케어',     emoji: '☀️', group: 'skincare', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'treatment',  label: '트리트먼트', emoji: '💊', group: 'skincare', color: 'bg-purple-100 text-purple-700' },
  // 기타
  { key: 'makeup', label: '메이크업', emoji: '💄', group: 'other', color: 'bg-pink-100 text-pink-700' },
  { key: 'body',   label: '바디케어', emoji: '🛁', group: 'other', color: 'bg-green-100 text-green-700' },
  { key: 'hair',   label: '헤어케어', emoji: '💆', group: 'other', color: 'bg-orange-100 text-orange-700' },
];

const getCategoryInfo = (key: string) =>
  CATEGORIES.find(c => c.key === key) ?? { label: key, emoji: '🧴', color: 'bg-muted text-muted-foreground' };

// ─── 사용 순서 프리셋 (직관적 단계) ─────────────────────────────────────────
interface StepPreset {
  order: number;
  label: string;
  desc: string;
}

const STEP_PRESETS: StepPreset[] = [
  { order: 1,  label: '클렌징',    desc: '세안 첫 단계' },
  { order: 2,  label: '토너/스킨', desc: '수분 첫 레이어' },
  { order: 3,  label: '에센스',    desc: '영양 부스팅' },
  { order: 4,  label: '세럼/앰플', desc: '집중 케어' },
  { order: 5,  label: '아이크림',  desc: '눈가 집중' },
  { order: 6,  label: '로션/에멀전', desc: '수분 잠금' },
  { order: 7,  label: '크림',      desc: '마지막 보습' },
  { order: 8,  label: '선크림',    desc: '자외선 차단' },
  { order: 9,  label: '메이크업',  desc: '베이스/색조' },
];

// ─── 클렌징 주기 솔루션 데이터 ───────────────────────────────────────────────
const CLEANSING_GUIDE: Record<string, { title: string; cycle: string; tip: string; ph: string }> = {
  cleansing_water: {
    title: '클렌징워터',
    cycle: '매일 아침·저녁 (저자극 일상 클렌징)',
    tip: '면봉·패드로 가볍게 닦아내기. 잔여물이 남지 않게 2~3번 반복하세요.',
    ph: 'pH 5.5~6.5 (약산성) 권장',
  },
  cleansing_oil: {
    title: '클렌징오일',
    cycle: '저녁 첫 클렌징 (더블 클렌징 1단계)',
    tip: '마른 손·마른 얼굴에 올려 마사지 후 물로 유화. 주 3~5회 선크림·메이크업 사용일 기준으로 조절하세요.',
    ph: 'pH 무관 (오일 기반)',
  },
  cleansing_foam: {
    title: '클렌징폼',
    cycle: '아침·저녁 2단계 클렌징',
    tip: '약산성(pH 5~6) 제품 선호. 강한 세정력 제품은 주 2~3회 이하로 제한하세요.',
    ph: 'pH 5.0~6.5 (약산성) 추천 / 9 이상은 피부 장벽 손상 위험',
  },
};

// ─── 빈 폼 ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  product_name: '',
  product_brand: '',
  category: 'skincare' as CategoryKey,
  step_order: 2,
  is_morning: true,
  is_evening: true,
  notes: '',
};

type FilterTab = 'all' | 'morning' | 'evening';
type FilterCat = CategoryKey | 'all' | 'cleansing';

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
const MyCabinet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CabinetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [filterCat, setFilterCat] = useState<FilterCat>('all');

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<HistoryItem[]>([]);

  // 카드 펼침
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 클렌징 가이드 팝업
  const [cleansingGuide, setCleansingGuide] = useState<string | null>(null);

  // ─── 데이터 로드 ────────────────────────────────────────────────────────────
  const loadCabinet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('my_cabinet' as never)
      .select('*')
      .eq('user_id', user.id)
      .order('step_order', { ascending: true });
    setItems((data as CabinetItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCabinet(); }, [loadCabinet]);

  const loadHistory = useCallback(async () => {
    if (!user || history.length > 0) return;
    const { data } = await supabase
      .from('analysis_history')
      .select('id, product_name, product_brand, ingredients_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data ?? []) as HistoryItem[]);
  }, [user, history.length]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(history);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      history.filter(h =>
        (h.product_name ?? '').toLowerCase().includes(q) ||
        (h.product_brand ?? '').toLowerCase().includes(q),
      ),
    );
  }, [searchQuery, history]);

  // ─── 모달 열기 ──────────────────────────────────────────────────────────────
  const openAdd = async () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setSearchQuery('');
    setShowModal(true);
    await loadHistory();
  };

  const openEdit = (item: CabinetItem) => {
    setEditId(item.id);
    setForm({
      product_name: item.product_name,
      product_brand: item.product_brand ?? '',
      category: item.category as CategoryKey,
      step_order: item.step_order,
      is_morning: item.is_morning,
      is_evening: item.is_evening,
      notes: item.notes ?? '',
    });
    setSearchQuery('');
    setShowModal(true);
  };

  // 검색 결과에서 제품 선택 → 폼 자동 완성
  const selectFromHistory = (h: HistoryItem) => {
    setForm(f => ({
      ...f,
      product_name: h.product_name || '',
      product_brand: h.product_brand || '',
    }));
    setSearchQuery('');
  };

  // ─── 저장 ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.product_name.trim() || !user) return;
    const payload = {
      user_id: user.id,
      product_name: form.product_name.trim(),
      product_brand: form.product_brand.trim() || null,
      category: form.category,
      step_order: form.step_order,
      is_morning: form.is_morning,
      is_evening: form.is_evening,
      is_opened: false,
      opened_at: null,
      pao_months: null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      await supabase.from('my_cabinet' as never).update(payload as never).eq('id', editId);
    } else {
      await supabase.from('my_cabinet' as never).insert(payload as never);
    }

    setShowModal(false);
    await loadCabinet();
    toast({ title: editId ? '수정했어요' : '보관함에 추가했어요' });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('my_cabinet' as never).delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: '삭제했어요' });
  };

  // ─── 필터링 ──────────────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    const matchTab =
      filterTab === 'all' ||
      (filterTab === 'morning' && item.is_morning) ||
      (filterTab === 'evening' && item.is_evening);
    const matchCat =
      filterCat === 'all' ||
      (filterCat === 'cleansing' && item.category.startsWith('cleansing')) ||
      item.category === filterCat;
    return matchTab && matchCat;
  });

  const morningItems = items.filter(i => i.is_morning).sort((a, b) => a.step_order - b.step_order);
  const eveningItems = items.filter(i => i.is_evening).sort((a, b) => a.step_order - b.step_order);

  // 클렌징 카테고리 보유 여부
  const cleansingItems = items.filter(i => i.category.startsWith('cleansing'));

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">내 화장품 보관함</h1>
          <p className="text-xs text-muted-foreground">{items.length}개 제품</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> 추가
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* 아침/저녁 루틴 미리보기 */}
        {(morningItems.length > 0 || eveningItems.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">아침</span>
                <span className="ml-auto text-xs font-bold text-yellow-600">{morningItems.length}개</span>
              </div>
              <div className="space-y-1">
                {morningItems.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-yellow-400 w-3">{i + 1}</span>
                    <span className="text-[11px] text-yellow-800 truncate flex-1">{item.product_name}</span>
                  </div>
                ))}
                {morningItems.length > 5 && (
                  <span className="text-[10px] text-yellow-400">+{morningItems.length - 5}개 더</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700">저녁</span>
                <span className="ml-auto text-xs font-bold text-indigo-600">{eveningItems.length}개</span>
              </div>
              <div className="space-y-1">
                {eveningItems.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-indigo-400 w-3">{i + 1}</span>
                    <span className="text-[11px] text-indigo-800 truncate flex-1">{item.product_name}</span>
                  </div>
                ))}
                {eveningItems.length > 5 && (
                  <span className="text-[10px] text-indigo-400">+{eveningItems.length - 5}개 더</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 클렌징 솔루션 카드 — 클렌징 제품 보유 시 표시 */}
        {cleansingItems.length > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-bold text-teal-800">클렌징 루틴 가이드</span>
            </div>
            <div className="space-y-2">
              {cleansingItems.map(item => {
                const guide = CLEANSING_GUIDE[item.category];
                if (!guide) return null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCleansingGuide(cleansingGuide === item.category ? null : item.category)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getCategoryInfo(item.category).emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-teal-800">{item.product_name}</p>
                          <p className="text-[10px] text-teal-600">{guide.cycle}</p>
                        </div>
                      </div>
                      <Info className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    </div>
                    {cleansingGuide === item.category && (
                      <div className="mt-2 rounded-xl bg-white/70 p-3 space-y-1.5">
                        <p className="text-[11px] text-teal-700 leading-relaxed">💡 {guide.tip}</p>
                        <p className="text-[11px] text-teal-600 font-medium">⚗️ {guide.ph}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 필터 탭 */}
        <div className="flex gap-1.5 rounded-xl bg-muted p-1">
          {(['all', 'morning', 'evening'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                filterTab === tab ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab === 'all' ? '전체' : tab === 'morning'
                ? <><Sun className="h-3 w-3" /> 아침</>
                : <><Moon className="h-3 w-3" /> 저녁</>}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'all',       label: '전체',    emoji: '' },
            { key: 'cleansing', label: '클렌징',  emoji: '🫧' },
            { key: 'skincare',  label: '스킨케어', emoji: '🧴' },
            { key: 'suncare',   label: '선케어',   emoji: '☀️' },
            { key: 'treatment', label: '트리트먼트', emoji: '💊' },
            { key: 'makeup',    label: '메이크업', emoji: '💄' },
            { key: 'body',      label: '바디',     emoji: '🛁' },
            { key: 'hair',      label: '헤어',     emoji: '💆' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => setFilterCat(c.key as FilterCat)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                filterCat === c.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white border border-border text-muted-foreground'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* 제품 목록 */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-neutral-200 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">보관함이 비어있어요</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              갖고 있는 화장품을 추가하면<br />날씨 맞춤 루틴 추천을 받을 수 있어요
            </p>
            <button onClick={openAdd}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground">
              첫 번째 제품 추가
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const catInfo = getCategoryInfo(item.category);
              const stepInfo = STEP_PRESETS.find(s => s.order === item.step_order);
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    {/* 단계 배지 */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${catInfo.color}`}>
                      {catInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${catInfo.color}`}>
                          {stepInfo ? stepInfo.label : catInfo.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground mt-0.5 truncate">{item.product_name}</p>
                      {item.product_brand && (
                        <p className="text-xs text-muted-foreground truncate">{item.product_brand}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex gap-1">
                      {item.is_morning && <Sun className="h-3.5 w-3.5 text-yellow-500" />}
                      {item.is_evening && <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2.5 bg-neutral-50">
                      {item.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> 수정
                        </button>
                        <button
                          onClick={() => navigate('/routine', { state: { cabinetItem: { id: item.id, product_name: item.product_name, product_brand: item.product_brand, category: item.category, analysis_history_id: item.analysis_history_id } } })}
                          className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-600"
                        >
                          <Layers className="h-3 w-3" /> 루틴에 추가
                        </button>
                        {item.analysis_history_id && (
                          <button
                            onClick={() => navigate('/history', { state: { highlightId: item.analysis_history_id } })}
                            className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600"
                          >
                            <FlaskConical className="h-3 w-3" /> 성분 확인
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          <Trash2 className="h-3 w-3" /> 삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 제품 추가/수정 모달 ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-h-[92vh] rounded-t-3xl bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold">{editId ? '제품 수정' : '제품 추가'}</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5 pb-10">

              {/* ① 분석 기록 검색으로 불러오기 */}
              {!editId && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">분석 기록에서 검색</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="제품명 또는 브랜드로 검색"
                      className="w-full rounded-xl border border-border bg-neutral-50 pl-9 pr-4 py-3 text-sm outline-none focus:border-primary"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* 검색 결과 */}
                  {searchResults.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.slice(0, 10).map(h => {
                        const alreadyIn = items.some(i => i.analysis_history_id === h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            disabled={alreadyIn}
                            onClick={() => selectFromHistory(h)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border last:border-b-0 transition-colors ${
                              alreadyIn ? 'opacity-40 cursor-not-allowed bg-neutral-50' : 'hover:bg-accent'
                            }`}
                          >
                            <FlaskConical className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{h.product_name || '이름 없는 제품'}</p>
                              {h.product_brand && (
                                <p className="text-[10px] text-muted-foreground">{h.product_brand}</p>
                              )}
                            </div>
                            {alreadyIn
                              ? <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">보관 중</span>
                              : <span className="text-[10px] text-primary font-semibold shrink-0">선택</span>
                            }
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {history.length > 0 && searchResults.length === 0 && searchQuery && (
                    <p className="text-xs text-muted-foreground text-center py-2">검색 결과가 없어요. 아래에 직접 입력해주세요.</p>
                  )}

                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">분석 기록이 없어요. 아래에 직접 입력해주세요.</p>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">또는 직접 입력</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </div>
              )}

              {/* ② 제품명 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">제품명 *</label>
                <input
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="예: 설화수 윤조에센스"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* ③ 브랜드 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">브랜드</label>
                <input
                  value={form.product_brand}
                  onChange={e => setForm(f => ({ ...f, product_brand: e.target.value }))}
                  placeholder="예: 설화수"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* ④ 카테고리 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">카테고리</label>

                {/* 클렌징 그룹 */}
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">클렌징</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.group === 'cleansing').map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: c.key, step_order: 1 }))}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        form.category === c.key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* 스킨케어 그룹 */}
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">스킨케어</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.group === 'skincare').map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        form.category === c.key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* 기타 그룹 */}
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">기타</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.group === 'other').map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        form.category === c.key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⑤ 사용 시간대 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">사용 시간대</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_morning: !f.is_morning }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      form.is_morning
                        ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-700'
                        : 'border-2 border-border text-muted-foreground'
                    }`}
                  >
                    <Sun className="h-4 w-4" /> 아침
                    {form.is_morning && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_evening: !f.is_evening }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      form.is_evening
                        ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700'
                        : 'border-2 border-border text-muted-foreground'
                    }`}
                  >
                    <Moon className="h-4 w-4" /> 저녁
                    {form.is_evening && <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* ⑥ 사용 순서 — 직관적 단계 선택 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">피부 루틴 단계</label>
                <p className="text-[10px] text-muted-foreground">이 제품을 사용하는 단계를 선택해주세요</p>
                <div className="grid grid-cols-3 gap-2">
                  {STEP_PRESETS.map(step => (
                    <button
                      key={step.order}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, step_order: step.order }))}
                      className={`flex flex-col items-center rounded-xl py-2.5 px-2 text-center transition-all ${
                        form.step_order === step.order
                          ? 'bg-primary text-primary-foreground border-2 border-primary'
                          : 'border border-border text-muted-foreground bg-neutral-50'
                      }`}
                    >
                      <span className={`text-xs font-bold ${form.step_order === step.order ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </span>
                      <span className={`text-[9px] mt-0.5 ${form.step_order === step.order ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {step.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ⑦ 메모 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">메모 (선택)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="사용 방법, 특이사항 등"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm resize-none outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!form.product_name.trim()}
                className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {editId ? '수정 완료' : '보관함에 추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MyCabinet;
