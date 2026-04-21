import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import { ChevronLeft, ShieldAlert, Trash2, Info, TrendingUp, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BlacklistItem {
  id: string;
  ingredient_name: string;
  ingredient_name_en: string | null;
  danger_count: number;
  caution_count: number;
  last_seen_at: string;
  is_confirmed: boolean;
}

const BlacklistPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [adding, setAdding] = useState(false);

  const loadBlacklist = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('skin_blacklist' as never)
      .select('*')
      .eq('user_id', user.id)
      .order('danger_count', { ascending: false });
    setItems((data as BlacklistItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadBlacklist(); }, [user]);

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase
      .from('skin_blacklist' as never)
      .delete()
      .eq('id', id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: `'${name}' 블랙리스트에서 제거했어요.` });
    }
  };

  const handleAddManual = async () => {
    const name = newIngredient.trim();
    if (!name || !user) return;
    setAdding(true);
    const { error } = await supabase
      .from('skin_blacklist' as never)
      .upsert({
        user_id: user.id,
        ingredient_name: name,
        danger_count: 1,
        is_confirmed: true,
      } as never, { onConflict: 'user_id,ingredient_name' });
    setAdding(false);
    if (!error) {
      setNewIngredient('');
      setShowAddModal(false);
      await loadBlacklist();
      toast({ title: `'${name}'을 블랙리스트에 추가했어요.` });
    }
  };

  const riskLevel = (item: BlacklistItem) => {
    if (item.danger_count >= 3) return { label: '높음', color: 'text-red-600 bg-red-50 border-red-200' };
    if (item.danger_count >= 2) return { label: '중간', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: '낮음', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">내 피부 블랙리스트</h1>
          <p className="text-xs text-muted-foreground">분석 기록에서 위험 성분을 자동 학습해요</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> 직접 추가
        </button>
      </div>

      {/* 안내 배너 */}
      <div className="mx-4 mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700">자동 학습 중</p>
            <p className="mt-0.5 text-xs text-blue-600 leading-relaxed">
              성분 분석 시 <strong>위험·주의</strong> 등급 성분이 자동으로 저장됩니다.
              새 제품 분석 시 해당 성분이 포함되면 즉시 경보를 드려요.
            </p>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="px-4 mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <ShieldAlert className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">블랙리스트가 아직 비어있어요</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              지금 피부에 잘 맞지 않는 성분이 없거나, 아직 분석을 많이 안 하셨을 수 있어요.
            </p>
            <div className="mt-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 max-w-xs">
              <p className="text-xs font-semibold text-blue-700 mb-1">🤖 자동 학습 방식</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                제품 성분 분석 시 <strong>위험·주의</strong> 등급으로 나온 성분이 자동으로 여기에 기록됩니다.
                분석 횟수가 쌓일수록 내 피부에 맞지 않는 성분 패턴이 자동으로 파악돼요.
              </p>
            </div>
            <button
              onClick={() => navigate('/scan')}
              className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              지금 성분 분석하기
            </button>
          </div>
        ) : (
          items.map(item => {
            const risk = riskLevel(item);
            const lastSeen = new Date(item.last_seen_at);
            const dateStr = `${lastSeen.getMonth() + 1}/${lastSeen.getDate()}`;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{item.ingredient_name}</p>
                      {item.is_confirmed && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">직접 등록</span>
                      )}
                    </div>
                    {item.ingredient_name_en && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.ingredient_name_en}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${risk.color}`}>
                        위험도 {risk.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {item.danger_count}회 위험 · {item.caution_count}회 주의
                      </span>
                      <span className="text-xs text-muted-foreground">마지막 {dateStr}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.ingredient_name)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 직접 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md rounded-t-3xl bg-white px-4 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">성분 직접 추가</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">성분명 (한국어 또는 영어)</label>
              <input
                value={newIngredient}
                onChange={e => setNewIngredient(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                placeholder="예: 페녹시에탄올, Phenoxyethanol"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleAddManual}
              disabled={!newIngredient.trim() || adding}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {adding ? '추가 중...' : '블랙리스트에 추가'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default BlacklistPage;
