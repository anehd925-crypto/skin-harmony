import { useState, useEffect } from 'react';
import {
  useUser, SKIN_CONCERNS, PERSONAL_COLORS,
  SKIN_SENSITIVITIES, SKIN_CONDITIONS, AGE_GROUPS, SKIN_GOALS, AVOID_INGREDIENTS,
  type SkinConcern,
} from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import FeedbackModal from '@/components/FeedbackModal';
import NotificationSettingsCard from '@/components/NotificationSettingsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, LogOut, ChevronDown, ChevronUp, Users, MessageSquare, Star, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TopProduct {
  id: string;
  product_name: string;
  product_brand: string | null;
  my_rating: number;
  my_review: string | null;
}

const Section = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
};

const Profile = () => {
  const {
    profile, toggleConcern, setConcernPriority,
    setPersonalColor, setAllergies, saveProfile,
    setAgeGroup,
    toggleGoal, toggleAvoid, setNickname,
  } = useUser();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [allergyInput, setAllergyInput] = useState(profile.allergies.join(', '));
  const [nicknameInput, setNicknameInput] = useState(profile.nickname ?? '');
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('my_cabinet' as never)
      .select('id, product_name, product_brand, my_rating, my_review')
      .eq('user_id', user.id)
      .not('my_rating', 'is', null)
      .order('my_rating', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTopProducts((data as TopProduct[]) ?? []);
      });
  }, [user]);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
      toast({ title: '탈퇴 완료', description: '계정이 삭제되었습니다.' });
      navigate('/auth', { replace: true });
    } catch {
      toast({ title: '탈퇴 실패', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = async () => {
    setAllergies(allergyInput.split(',').map(s => s.trim()).filter(Boolean));
    setNickname(nicknameInput.trim());
    try {
      await saveProfile();
      setSaved(true);
      toast({ title: '저장 완료', description: '프로필이 업데이트되었습니다.' });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: '저장 실패', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">프로필</h1>
            {profile.skinType && (
              <p className="text-xs text-muted-foreground mt-0.5">{profile.skinType}</p>
            )}
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-foreground">
            <LogOut className="h-3.5 w-3.5" />로그아웃
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* 프로필 요약 */}
        <div className="rounded-xl border border-border bg-card p-3">
          {profile.nickname && (
            <p className="text-sm font-semibold text-foreground mb-1.5">{profile.nickname}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {profile.ageGroup && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{AGE_GROUPS.find(a => a.value === profile.ageGroup)?.label}</span>}
            {profile.skinType && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{profile.skinType}</span>}
            {profile.skinSensitivity && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{SKIN_SENSITIVITIES.find(s => s.value === profile.skinSensitivity)?.label}</span>}
            {profile.skinConcerns.slice(0, 3).map(c => <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{c}</span>)}
          </div>
        </div>
        {/* 내 화장품 TOP5 */}
        {topProducts.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <h2 className="text-sm font-bold text-foreground">내 화장품 TOP {topProducts.length}</h2>
            </div>
            <div className="divide-y divide-border">
              {topProducts.map((p, idx) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs font-black text-primary w-5 text-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.product_name}</p>
                    {p.product_brand && <p className="text-xs text-muted-foreground truncate">{p.product_brand}</p>}
                    {p.my_review && <p className="text-xs text-muted-foreground mt-0.5 truncate">"{p.my_review}"</p>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map(v => (
                      <Star key={v} className={`h-3 w-3 ${v <= p.my_rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/cabinet')}
              className="w-full py-2.5 text-xs font-semibold text-primary border-t border-border"
            >
              보관함에서 평가하기
            </button>
          </div>
        )}

        {topProducts.length === 0 && (
          <button
            onClick={() => navigate('/cabinet')}
            className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center"
          >
            <Package className="h-6 w-6 text-primary/40 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-primary">내 화장품에 별점을 남겨보세요</p>
            <p className="text-xs text-muted-foreground mt-0.5">보관함에서 제품을 평가하면 TOP5에 표시돼요</p>
          </button>
        )}

        {/* 알림 설정 */}
        <NotificationSettingsCard />

        {/* 닉네임 섹션 */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">커뮤니티 닉네임</h2>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-muted-foreground">커뮤니티 게시물과 댓글에 표시되는 이름이에요</p>
            <Input
              placeholder="예: 뷰티러버, 피부관리중 (10자 이내)"
              value={nicknameInput}
              maxLength={10}
              onChange={e => setNicknameInput(e.target.value)}
              className="rounded-xl border border-border"
            />
            {nicknameInput.trim() === '' && (
              <p className="text-xs text-warning">닉네임을 설정하지 않으면 커뮤니티에서 익명으로 표시돼요</p>
            )}
          </div>
        </div>
        <Section title="연령대">
          <div className="grid grid-cols-3 gap-2">
            {AGE_GROUPS.map(({ value, label }) => (
              <button key={value} onClick={() => setAgeGroup(value)}
                className={`rounded-xl border py-2.5 text-sm font-medium transition-all ${profile.ageGroup === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 피부 진단 결과 (단일 진실: 6문항 진단으로만 결정) ── */}
        <section className="rounded-xl border border-primary/20 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">내 피부 진단 결과</h2>
            <button
              onClick={() => navigate('/onboarding')}
              className="text-xs font-semibold text-primary"
            >
              {profile.skinType ? '다시 진단' : '진단 시작'}
            </button>
          </div>

          {profile.skinType ? (
            <div className="px-4 py-3 space-y-3">
              {/* 메인: 피부 타입 */}
              <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground">피부 타입</p>
                <p className="text-xl font-black text-primary mt-0.5">{profile.skinType}</p>
              </div>

              {/* 보조: 유수분 + 민감도 (모두 진단 결과) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-white px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">유수분 상태</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {SKIN_CONDITIONS.find(c => c.value === profile.skinCondition)?.label ?? '미진단'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">민감도</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {SKIN_SENSITIVITIES.find(s => s.value === profile.skinSensitivity)?.label ?? '미진단'}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                피부 타입·유수분·민감도는 6문항 진단으로 한 번에 결정됩니다. 결과가 다르다고 느껴지면 "다시 진단"으로 답변을 수정해주세요.
              </p>
            </div>
          ) : (
            <button
              onClick={() => navigate('/onboarding')}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-base">🧬</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">아직 피부 진단을 하지 않았어요</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  6문항으로 피부 타입·유수분·민감도를 한 번에 진단합니다
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
            </button>
          )}
        </section>

        <Section title="피부 고민 (우선순위 순)">
          <p className="text-xs text-muted-foreground">먼저 누른 순서가 우선순위예요</p>
          <div className="flex flex-wrap gap-2">
            {SKIN_CONCERNS.map(concern => {
              const priority = profile.concernPriority.indexOf(concern) + 1;
              return (
                <button key={concern} onClick={() => handleToggleConcern(concern)}
                  className={`relative rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${profile.skinConcerns.includes(concern) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                  {concern}
                  {priority > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{priority}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="스킨케어 목표" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {SKIN_GOALS.map(g => (
              <button key={g} onClick={() => toggleGoal(g)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${profile.skinGoals.includes(g) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {g}
              </button>
            ))}
          </div>
        </Section>

        <Section title="기피 성분" defaultOpen={false}>
          <p className="text-xs text-muted-foreground">분석 시 경고로 표시돼요</p>
          <div className="flex flex-wrap gap-2">
            {AVOID_INGREDIENTS.map(a => (
              <button key={a} onClick={() => toggleAvoid(a)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${profile.avoidIngredients.includes(a) ? 'border-danger/70 bg-danger/10 text-danger' : 'border-border text-foreground'}`}>
                {a}
              </button>
            ))}
          </div>
        </Section>

        <Section title="퍼스널컬러" defaultOpen={false}>
          <div className="grid grid-cols-3 gap-2">
            {PERSONAL_COLORS.map(color => (
              <button key={color} onClick={() => setPersonalColor(color)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${profile.personalColor === color ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {color}
              </button>
            ))}
          </div>
        </Section>

        <Section title="알레르기 성분 (직접 입력)" defaultOpen={false}>
          <p className="text-xs text-muted-foreground">기피 성분 목록에 없는 특정 성분을 쉼표로 구분해 입력해주세요</p>
          <Input placeholder="예: 프로폴리스, 티트리오일" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} className="rounded-xl border border-border" />
        </Section>

        <Button onClick={handleSave} className="w-full rounded-xl h-12 bg-primary text-primary-foreground text-base font-semibold shadow-primary">
          {saved ? <><Check className="mr-1 h-4 w-4" /> 저장됨</> : '저장하기'}
        </Button>

        {/* 의견 보내기 */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary"
        >
          <MessageSquare className="h-4 w-4" />
          의견 보내기 / 버그 제보
        </button>

        {/* 계정 탈퇴 */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-destructive">계정 탈퇴</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            탈퇴 시 모든 분석 기록, 루틴, 피부 일기 데이터가 영구 삭제되며 복구할 수 없습니다.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-destructive underline underline-offset-2"
            >
              계정 탈퇴하기
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive">정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 rounded-lg bg-destructive py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {deleteLoading ? '처리 중...' : '탈퇴 확인'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
};

export default Profile;
