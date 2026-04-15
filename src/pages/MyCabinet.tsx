import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, Plus, Trash2, Sun, Moon, Pencil,
  Package, X, Check, ChevronDown, ChevronUp,
  FlaskConical, Layers, Search, Sparkles, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── 타입 ─────────────────────────────────────────────────────────────────────
interface CabinetItem {
  id: string;
  product_name: string;
  product_brand: string | null;
  category: string;
  step_order: number;
  is_morning: boolean;
  is_evening: boolean;
  notes: string | null;
  analysis_history_id: string | null;
}

interface ProductSuggestion {
  name: string;
  brand: string;
  category: string;
  step: string;
  is_morning: boolean;
  is_evening: boolean;
  note: string;
}

// ─── 카테고리 ─────────────────────────────────────────────────────────────────
type CategoryKey =
  | 'cleansing_water' | 'cleansing_oil' | 'cleansing_foam'
  | 'skincare' | 'suncare' | 'treatment' | 'makeup' | 'body' | 'hair';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  emoji: string;
  group: 'cleansing' | 'skincare' | 'other';
  color: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'cleansing_water', label: '클렌징워터', emoji: '💧', group: 'cleansing', color: 'bg-sky-100 text-sky-700' },
  { key: 'cleansing_oil',   label: '클렌징오일',  emoji: '🫙', group: 'cleansing', color: 'bg-amber-100 text-amber-700' },
  { key: 'cleansing_foam',  label: '클렌징폼',    emoji: '🫧', group: 'cleansing', color: 'bg-teal-100 text-teal-700' },
  { key: 'skincare',   label: '스킨케어',   emoji: '🧴', group: 'skincare', color: 'bg-blue-100 text-blue-700' },
  { key: 'suncare',    label: '선케어',     emoji: '☀️', group: 'skincare', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'treatment',  label: '트리트먼트', emoji: '💊', group: 'skincare', color: 'bg-purple-100 text-purple-700' },
  { key: 'makeup',     label: '메이크업',   emoji: '💄', group: 'other',    color: 'bg-pink-100 text-pink-700' },
  { key: 'body',       label: '바디케어',   emoji: '🛁', group: 'other',    color: 'bg-green-100 text-green-700' },
  { key: 'hair',       label: '헤어케어',   emoji: '💆', group: 'other',    color: 'bg-orange-100 text-orange-700' },
];

const getCat = (key: string): CategoryDef =>
  CATEGORIES.find(c => c.key === key) ?? { key: 'skincare', label: key, emoji: '🧴', group: 'skincare', color: 'bg-muted text-muted-foreground' };

// ─── 사용 단계 프리셋 ─────────────────────────────────────────────────────────
const STEP_PRESETS = [
  { order: 1, label: '클렌징',      desc: '세안' },
  { order: 2, label: '토너·스킨',   desc: '첫 수분' },
  { order: 3, label: '에센스',      desc: '영양' },
  { order: 4, label: '세럼·앰플',   desc: '집중 케어' },
  { order: 5, label: '아이크림',    desc: '눈가' },
  { order: 6, label: '로션·에멀전', desc: '수분 잠금' },
  { order: 7, label: '크림',        desc: '보습 마무리' },
  { order: 8, label: '선크림',      desc: '자외선 차단' },
  { order: 9, label: '메이크업',    desc: '베이스·색조' },
];

// ─── 클렌징 가이드 ────────────────────────────────────────────────────────────
const CLEANSING_GUIDE: Record<string, { cycle: string; tip: string; ph: string }> = {
  cleansing_water: {
    cycle: '매일 아침·저녁 (저자극 일상 클렌징)',
    tip: '면봉·패드로 가볍게 닦아내기. 잔여물이 남지 않게 2~3번 반복',
    ph: 'pH 5.5~6.5 (약산성) 권장',
  },
  cleansing_oil: {
    cycle: '저녁 더블 클렌징 1단계 (메이크업·선크림 사용일)',
    tip: '마른 손·마른 얼굴에 올려 마사지 후 물로 유화. 주 3~5회 조절',
    ph: 'pH 무관 (오일 기반)',
  },
  cleansing_foam: {
    cycle: '아침·저녁 2단계 클렌징',
    tip: '약산성(pH 5~6) 제품 선호. 강한 세정력은 주 2~3회 이하 제한',
    ph: 'pH 5.0~6.5 권장 / pH 9 이상은 피부 장벽 손상 위험',
  },
};

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

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
const MyCabinet = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // 제품 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 카드 펼침
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 클렌징 가이드 토글
  const [guideOpenKey, setGuideOpenKey] = useState<string | null>(null);

  // ─── 데이터 로드 ─────────────────────────────────────────────────────────────
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

  // 카메라 제품 인식에서 prefill 데이터가 있으면 모달 자동 오픈
  useEffect(() => {
    const state = location.state as { prefill?: { name: string; brand: string; category: string; step: string; is_morning: boolean; is_evening: boolean; note: string } } | null;
    if (state?.prefill) {
      const stepMap: Record<string, number> = {
        '클렌징': 1, '토너·스킨': 2, '에센스': 3, '세럼·앰플': 4,
        '아이크림': 5, '로션·에멀전': 6, '크림': 7, '선크림': 8, '메이크업': 9,
      };
      const catMap: Record<string, CategoryKey> = {
        cleansing_foam: 'cleansing_foam', cleansing_oil: 'cleansing_oil',
        cleansing_water: 'cleansing_water', skincare: 'skincare',
        suncare: 'suncare', treatment: 'treatment',
        makeup: 'makeup', body: 'body', hair: 'hair',
      };
      setForm({
        product_name: state.prefill.name,
        product_brand: state.prefill.brand,
        category: (catMap[state.prefill.category] ?? 'skincare') as CategoryKey,
        step_order: stepMap[state.prefill.step] ?? 2,
        is_morning: state.prefill.is_morning,
        is_evening: state.prefill.is_evening,
        notes: state.prefill.note ? `AI 인식: ${state.prefill.note}` : '',
      });
      setEditId(null);
      setShowModal(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, location.pathname]);

  // ─── 제품 AI 검색 (디바운스 500ms) ──────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (!q || q.length < 1) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('product-search', {
          body: { query: q },
        });
        if (!error && data?.suggestions) {
          setSuggestions(data.suggestions as ProductSuggestion[]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // ─── 모달 ────────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setSearchQuery('');
    setSuggestions([]);
    setShowModal(true);
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
    setSuggestions([]);
    setShowModal(true);
  };

  const pickSuggestion = (s: ProductSuggestion) => {
    const stepMap: Record<string, number> = {
      '클렌징': 1, '토너·스킨': 2, '에센스': 3, '세럼·앰플': 4,
      '아이크림': 5, '로션·에멀전': 6, '크림': 7, '선크림': 8, '메이크업': 9,
    };
    const catMap: Record<string, CategoryKey> = {
      cleansing: 'cleansing_foam', cleansing_foam: 'cleansing_foam',
      cleansing_oil: 'cleansing_oil', cleansing_water: 'cleansing_water',
      skincare: 'skincare', suncare: 'suncare', treatment: 'treatment',
      makeup: 'makeup', body: 'body', hair: 'hair',
    };
    const mappedCat: CategoryKey = catMap[s.category] ?? 'skincare';
    const mappedStep = stepMap[s.step] ?? 2;
    setForm(f => ({
      ...f,
      product_name: s.name,
      product_brand: s.brand,
      category: mappedCat,
      step_order: mappedStep,
      is_morning: s.is_morning,
      is_evening: s.is_evening,
      notes: s.note ? `AI 추천: ${s.note}` : f.notes,
    }));
    setSearchQuery('');
    setSuggestions([]);
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
  const cleansingItems = items.filter(i => i.category.startsWith('cleansing'));

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">내 화장품 보관함</h1>
          <p className="text-xs text-muted-foreground">{items.length}개 제품</p>
        </div>
        <button
          onClick={() => navigate('/routine')}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary shrink-0"
        >
          <Layers className="h-3.5 w-3.5" /> 루틴 체커
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> 추가
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── 아침/저녁 루틴 요약 ── */}
        {(morningItems.length > 0 || eveningItems.length > 0) && (
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
                    <span className="w-3 shrink-0 text-[10px] font-bold text-yellow-400">{i + 1}</span>
                    <span className="text-[11px] text-yellow-800 truncate">{item.product_name}</span>
                  </div>
                ))}
                {morningItems.length > 5 && (
                  <p className="text-[10px] text-yellow-400">+{morningItems.length - 5}개 더</p>
                )}
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
                    <span className="w-3 shrink-0 text-[10px] font-bold text-indigo-400">{i + 1}</span>
                    <span className="text-[11px] text-indigo-800 truncate">{item.product_name}</span>
                  </div>
                ))}
                {eveningItems.length > 5 && (
                  <p className="text-[10px] text-indigo-400">+{eveningItems.length - 5}개 더</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 루틴 성분 궁합 바로가기 배너 ── */}
        {items.length >= 2 && (
          <button
            onClick={() => navigate('/routine')}
            className="flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-violet-800">루틴 성분 궁합 체크</p>
              <p className="text-[11px] text-violet-600 mt-0.5">보관함 제품들의 성분 충돌·시너지를 확인해보세요</p>
            </div>
            <ChevronDown className="h-4 w-4 text-violet-400 rotate-[-90deg] shrink-0" />
          </button>
        )}

        {/* ── 클렌징 솔루션 카드 ── */}
        {cleansingItems.length > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="text-sm font-bold text-teal-800">클렌징 루틴 가이드</span>
            </div>
            {cleansingItems.map(item => {
              const guide = CLEANSING_GUIDE[item.category];
              if (!guide) return null;
              const isOpen = guideOpenKey === item.id;
              const catInfo = getCat(item.category);
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => setGuideOpenKey(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{catInfo.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-teal-800 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-teal-600">{guide.cycle}</p>
                      </div>
                    </div>
                    <Info className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                  </button>
                  {isOpen && (
                    <div className="mt-2 rounded-xl bg-white/70 px-3 py-2.5 space-y-1.5">
                      <p className="text-[11px] text-teal-700 leading-relaxed">💡 {guide.tip}</p>
                      <p className="text-[11px] text-teal-600 font-medium">⚗️ {guide.ph}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 필터 탭 ── */}
        <div className="flex gap-1.5 rounded-xl bg-muted p-1">
          {(['all', 'morning', 'evening'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                filterTab === tab ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab === 'all' ? '전체' : tab === 'morning' ? <><Sun className="h-3 w-3" />아침</> : <><Moon className="h-3 w-3" />저녁</>}
            </button>
          ))}
        </div>

        {/* ── 카테고리 필터 스크롤 ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {[
            { key: 'all',       label: '전체',      emoji: '' },
            { key: 'cleansing', label: '클렌징',    emoji: '🫧' },
            { key: 'skincare',  label: '스킨케어',  emoji: '🧴' },
            { key: 'suncare',   label: '선케어',    emoji: '☀️' },
            { key: 'treatment', label: '트리트먼트', emoji: '💊' },
            { key: 'makeup',    label: '메이크업',  emoji: '💄' },
            { key: 'body',      label: '바디',       emoji: '🛁' },
            { key: 'hair',      label: '헤어',       emoji: '💆' },
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

        {/* ── 제품 목록 ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-8 w-8 text-primary/40" />
            </div>
            <p className="text-sm font-bold text-foreground">보관함이 비어있어요</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              갖고 있는 화장품을 추가하면<br />날씨 맞춤 루틴 추천을 받을 수 있어요
            </p>
            <button
              onClick={openAdd}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
            >
              첫 번째 제품 추가
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const catInfo = getCat(item.category);
              const stepInfo = STEP_PRESETS.find(s => s.order === item.step_order);
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
                  {/* ── 기본 행 ── */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    {/* 카테고리 아이콘 */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${catInfo.color}`}>
                      {catInfo.emoji}
                    </div>

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catInfo.color}`}>
                          {stepInfo?.label ?? catInfo.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{item.product_name}</p>
                      {item.product_brand && (
                        <p className="text-xs text-muted-foreground truncate">{item.product_brand}</p>
                      )}
                    </div>

                    {/* 시간대 아이콘 + 화살표 */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.is_morning && <Sun className="h-3.5 w-3.5 text-yellow-400" />}
                      {item.is_evening && <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {/* ── 펼침 영역 ── */}
                  {isExpanded && (
                    <div className="border-t border-border bg-neutral-50 px-4 py-3 space-y-3">
                      {item.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> 수정
                        </button>
                        <button
                          onClick={() => navigate('/routine')}
                          className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600"
                        >
                          <Layers className="h-3 w-3" /> 루틴 체커
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

      {/* ─── 제품 추가/수정 모달 ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-h-[92vh] rounded-t-3xl bg-white overflow-y-auto">

            {/* 핸들 + 타이틀 */}
            <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{editId ? '제품 수정' : '제품 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-6 pb-12">

              {/* ① 제품 검색 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">제품 검색</label>
                <p className="text-[11px] text-muted-foreground">제품명이나 브랜드로 검색하면 자동으로 채워져요</p>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="예: 라네즈, 설화수, 토리든..."
                    className="w-full rounded-xl border border-border bg-neutral-50 pl-10 pr-10 py-3 text-sm outline-none focus:border-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* 검색 결과 드롭다운 */}
                {searchQuery && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    {searchLoading ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        AI가 제품을 찾고 있어요...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pickSuggestion(s)}
                          className="flex w-full items-center gap-3 border-b border-border last:border-b-0 px-4 py-3 text-left hover:bg-accent transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base">
                            {getCat(s.category).emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.brand} · {s.step}</p>
                            {s.note && <p className="text-[10px] text-primary/70 mt-0.5">{s.note}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-primary font-semibold">선택</span>
                            <div className="flex gap-1">
                              {s.is_morning && <span className="text-[9px] text-yellow-600 bg-yellow-50 px-1.5 rounded-full">아침</span>}
                              {s.is_evening && <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 rounded-full">저녁</span>}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        검색 결과가 없어요. 아래에 직접 입력해주세요.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground px-1">또는 직접 입력</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>

              {/* ② 제품명 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">제품명 *</label>
                <input
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="예: 설화수 윤조에센스"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* ③ 브랜드 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">브랜드</label>
                <input
                  value={form.product_brand}
                  onChange={e => setForm(f => ({ ...f, product_brand: e.target.value }))}
                  placeholder="예: 설화수"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* ④ 카테고리 */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">카테고리</label>
                {(['cleansing', 'skincare', 'other'] as const).map(group => (
                  <div key={group} className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group === 'cleansing' ? '클렌징' : group === 'skincare' ? '스킨케어' : '기타'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.filter(c => c.group === group).map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, category: c.key, step_order: c.group === 'cleansing' ? 1 : f.step_order }))}
                          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                            form.category === c.key
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-muted-foreground bg-white'
                          }`}
                        >
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ⑤ 사용 시간대 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">사용 시간대</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'is_morning' as const, label: '아침', icon: <Sun className="h-4 w-4" />, active: 'bg-yellow-50 border-yellow-400 text-yellow-700' },
                    { key: 'is_evening' as const, label: '저녁', icon: <Moon className="h-4 w-4" />, active: 'bg-indigo-50 border-indigo-400 text-indigo-700' },
                  ].map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                        form[t.key] ? t.active : 'border-border text-muted-foreground bg-white'
                      }`}
                    >
                      {t.icon} {t.label}
                      {form[t.key] && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⑥ 사용 단계 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">피부 루틴 단계</label>
                <div className="grid grid-cols-3 gap-2">
                  {STEP_PRESETS.map(step => (
                    <button
                      key={step.order}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, step_order: step.order }))}
                      className={`flex flex-col items-center rounded-xl py-2.5 px-2 text-center transition-all ${
                        form.step_order === step.order
                          ? 'bg-primary border-2 border-primary text-primary-foreground'
                          : 'border border-border bg-neutral-50 text-muted-foreground'
                      }`}
                    >
                      <span className={`text-xs font-bold ${form.step_order === step.order ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </span>
                      <span className={`text-[9px] mt-0.5 ${form.step_order === step.order ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {step.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ⑦ 메모 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">메모 (선택)</label>
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
                className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
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
