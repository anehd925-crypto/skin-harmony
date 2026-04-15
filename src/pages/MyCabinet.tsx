import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  ChevronLeft, Plus, Trash2, Sun, Moon, Pencil,
  Package, Droplets, X, Check, ChevronDown, ChevronUp,
  FlaskConical, CalendarDays,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

type CategoryKey = 'skincare' | 'suncare' | 'makeup' | 'treatment' | 'body' | 'hair';

const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: 'skincare',  label: '스킨케어', emoji: '🧴' },
  { key: 'suncare',   label: '선케어',   emoji: '☀️' },
  { key: 'treatment', label: '트리트먼트', emoji: '💊' },
  { key: 'makeup',    label: '메이크업',  emoji: '💄' },
  { key: 'body',      label: '바디케어',  emoji: '🛁' },
  { key: 'hair',      label: '헤어케어',  emoji: '💆' },
];

const STEP_LABELS: Record<string, { label: string; color: string }> = {
  skincare: { label: '기초', color: 'bg-blue-100 text-blue-600' },
  suncare:  { label: '선케어', color: 'bg-yellow-100 text-yellow-600' },
  treatment: { label: '트리트먼트', color: 'bg-purple-100 text-purple-600' },
  makeup:   { label: '메이크업', color: 'bg-pink-100 text-pink-600' },
  body:     { label: '바디', color: 'bg-green-100 text-green-600' },
  hair:     { label: '헤어', color: 'bg-orange-100 text-orange-600' },
};

const daysSinceOpened = (openedAt: string | null) => {
  if (!openedAt) return null;
  const diff = Date.now() - new Date(openedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const paoStatus = (item: CabinetItem): { label: string; color: string } | null => {
  if (!item.is_opened || !item.pao_months || !item.opened_at) return null;
  const days = daysSinceOpened(item.opened_at) ?? 0;
  const total = item.pao_months * 30;
  const ratio = days / total;
  if (ratio >= 1) return { label: '유통기한 초과', color: 'text-red-600 bg-red-50' };
  if (ratio >= 0.8) return { label: '곧 만료', color: 'text-orange-600 bg-orange-50' };
  return { label: `${item.pao_months}M 사용 가능`, color: 'text-green-600 bg-green-50' };
};

const EMPTY_FORM = {
  product_name: '',
  product_brand: '',
  category: 'skincare' as CategoryKey,
  step_order: 5,
  is_morning: true,
  is_evening: true,
  is_opened: false,
  opened_at: '',
  pao_months: 12,
  notes: '',
};

type FilterTab = 'all' | 'morning' | 'evening';

const MyCabinet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CabinetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [filterCat, setFilterCat] = useState<CategoryKey | 'all'>('all');

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // 분석 기록에서 불러오기
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 카드 펼침 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('analysis_history')
      .select('id, product_name, product_brand, ingredients_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory((data ?? []) as HistoryItem[]);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
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
      is_opened: item.is_opened,
      opened_at: item.opened_at ?? '',
      pao_months: item.pao_months ?? 12,
      notes: item.notes ?? '',
    });
    setShowModal(true);
  };

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
      is_opened: form.is_opened,
      opened_at: form.is_opened && form.opened_at ? form.opened_at : null,
      pao_months: form.pao_months || null,
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

  const handleFromHistory = async (h: HistoryItem) => {
    if (!user) return;
    await supabase.from('my_cabinet' as never).insert({
      user_id: user.id,
      product_name: h.product_name || '이름 없는 제품',
      product_brand: h.product_brand || null,
      category: 'skincare',
      step_order: 5,
      is_morning: true,
      is_evening: true,
      analysis_history_id: h.id,
      updated_at: new Date().toISOString(),
    } as never);
    setShowHistoryPicker(false);
    await loadCabinet();
    toast({ title: `'${h.product_name}'을 보관함에 추가했어요` });
  };

  const filtered = items.filter(item => {
    const matchTab = filterTab === 'all'
      || (filterTab === 'morning' && item.is_morning)
      || (filterTab === 'evening' && item.is_evening);
    const matchCat = filterCat === 'all' || item.category === filterCat;
    return matchTab && matchCat;
  });

  const morningItems = items.filter(i => i.is_morning).sort((a, b) => a.step_order - b.step_order);
  const eveningItems = items.filter(i => i.is_evening).sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-neutral-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">내 화장품 보관함</h1>
          <p className="text-xs text-muted-foreground">{items.length}개 제품 보유 중</p>
        </div>
        <button
          onClick={() => { loadHistory(); setShowHistoryPicker(true); }}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <FlaskConical className="h-3.5 w-3.5" /> 분석기록 추가
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> 직접 추가
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* 루틴 미리보기 카드 — 아침/저녁 순서 */}
        {(morningItems.length > 0 || eveningItems.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {/* 아침 루틴 */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">아침 루틴</span>
                <span className="ml-auto text-xs font-bold text-yellow-600">{morningItems.length}개</span>
              </div>
              <div className="space-y-1">
                {morningItems.slice(0, 4).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-yellow-500 w-3">{i + 1}</span>
                    <span className="text-[11px] text-yellow-800 truncate flex-1">{item.product_name}</span>
                  </div>
                ))}
                {morningItems.length > 4 && (
                  <span className="text-[10px] text-yellow-500">+{morningItems.length - 4}개 더</span>
                )}
              </div>
            </div>

            {/* 저녁 루틴 */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700">저녁 루틴</span>
                <span className="ml-auto text-xs font-bold text-indigo-600">{eveningItems.length}개</span>
              </div>
              <div className="space-y-1">
                {eveningItems.slice(0, 4).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-indigo-500 w-3">{i + 1}</span>
                    <span className="text-[11px] text-indigo-800 truncate flex-1">{item.product_name}</span>
                  </div>
                ))}
                {eveningItems.length > 4 && (
                  <span className="text-[10px] text-indigo-500">+{eveningItems.length - 4}개 더</span>
                )}
              </div>
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
              {tab === 'all' ? '전체' : tab === 'morning' ? <><Sun className="h-3 w-3" />아침</> : <><Moon className="h-3 w-3" />저녁</>}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterCat('all')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              filterCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-white border border-border text-muted-foreground'
            }`}
          >
            전체
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setFilterCat(c.key)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                filterCat === c.key ? 'bg-primary text-primary-foreground' : 'bg-white border border-border text-muted-foreground'
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
            <div className="flex gap-2 mt-2">
              <button onClick={openAdd}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                직접 추가
              </button>
              <button onClick={() => { loadHistory(); setShowHistoryPicker(true); }}
                className="rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary">
                분석기록에서
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const pao = paoStatus(item);
              const stepCfg = STEP_LABELS[item.category];
              const isExpanded = expandedId === item.id;

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    {/* 순서 번호 */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {item.step_order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stepCfg?.color ?? 'bg-muted text-muted-foreground'}`}>
                          {stepCfg?.label ?? item.category}
                        </span>
                        {pao && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pao.color}`}>{pao.label}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-foreground mt-0.5 truncate">{item.product_name}</p>
                      {item.product_brand && (
                        <p className="text-xs text-muted-foreground truncate">{item.product_brand}</p>
                      )}
                    </div>
                    {/* 아침/저녁 아이콘 */}
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
                      {item.is_opened && item.opened_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          개봉: {item.opened_at} ({daysSinceOpened(item.opened_at)}일째 사용 중)
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> 수정
                        </button>
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

      {/* 제품 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-h-[90vh] rounded-t-3xl bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold">{editId ? '제품 수정' : '제품 추가'}</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4 pb-8">

              {/* 이름 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">제품명 *</label>
                <input
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="예: 설화수 윤조에센스"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* 브랜드 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">브랜드</label>
                <input
                  value={form.product_brand}
                  onChange={e => setForm(f => ({ ...f, product_brand: e.target.value }))}
                  placeholder="예: 설화수"
                  className="w-full rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* 카테고리 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
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

              {/* 사용 시간대 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">사용 시간대</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_morning: !f.is_morning }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      form.is_morning ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-700' : 'border-2 border-border text-muted-foreground'
                    }`}
                  >
                    <Sun className="h-4 w-4" /> 아침
                    {form.is_morning && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_evening: !f.is_evening }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                      form.is_evening ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-700' : 'border-2 border-border text-muted-foreground'
                    }`}
                  >
                    <Moon className="h-4 w-4" /> 저녁
                    {form.is_evening && <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* 사용 순서 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">사용 순서</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, step_order: Math.max(1, f.step_order - 1) }))}
                    className="h-9 w-9 rounded-full border border-border bg-neutral-50 text-lg font-bold flex items-center justify-center"
                  >−</button>
                  <span className="text-2xl font-black text-primary w-8 text-center">{form.step_order}</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, step_order: Math.min(20, f.step_order + 1) }))}
                    className="h-9 w-9 rounded-full border border-border bg-neutral-50 text-lg font-bold flex items-center justify-center"
                  >+</button>
                  <span className="text-xs text-muted-foreground">숫자가 작을수록 먼저 사용</span>
                </div>
              </div>

              {/* 개봉 여부 */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">개봉 여부</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_opened: !f.is_opened }))}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all w-full ${
                    form.is_opened ? 'bg-green-50 border-2 border-green-400 text-green-700' : 'border-2 border-border text-muted-foreground'
                  }`}
                >
                  <Droplets className="h-4 w-4" />
                  {form.is_opened ? '개봉됨' : '미개봉'}
                  {form.is_opened && <Check className="h-4 w-4 ml-auto" />}
                </button>
                {form.is_opened && (
                  <div className="space-y-2 pl-1">
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-muted-foreground">개봉일</label>
                        <input
                          type="date"
                          value={form.opened_at}
                          onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-muted-foreground">유통기한(개월)</label>
                        <input
                          type="number"
                          value={form.pao_months}
                          min={1}
                          max={36}
                          onChange={e => setForm(f => ({ ...f, pao_months: parseInt(e.target.value) || 12 }))}
                          className="w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 메모 */}
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

      {/* 분석 기록에서 불러오기 모달 */}
      {showHistoryPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-h-[80vh] rounded-t-3xl bg-white overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-base font-bold">분석 기록에서 추가</p>
              <button onClick={() => setShowHistoryPicker(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">분석 기록이 없어요</p>
                  <button
                    onClick={() => { setShowHistoryPicker(false); navigate('/scan'); }}
                    className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    지금 분석하러 가기
                  </button>
                </div>
              ) : (
                history.map(h => {
                  const alreadyIn = items.some(i => i.analysis_history_id === h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      disabled={alreadyIn}
                      onClick={() => handleFromHistory(h)}
                      className={`w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors ${
                        alreadyIn ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent'
                      }`}
                    >
                      <FlaskConical className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{h.product_name || '이름 없는 제품'}</p>
                        {h.product_brand && <p className="text-xs text-muted-foreground">{h.product_brand}</p>}
                      </div>
                      {alreadyIn && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">보관 중</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MyCabinet;
