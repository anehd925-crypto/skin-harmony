import { useState } from 'react';
import {
  useUser, SKIN_TYPES, SKIN_CONCERNS, PERSONAL_COLORS,
  SKIN_SENSITIVITIES, SKIN_CONDITIONS, AGE_GROUPS, SKIN_GOALS, AVOID_INGREDIENTS,
  type SkinConcern,
} from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import FeedbackModal from '@/components/FeedbackModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Check, LogOut, ChevronDown, ChevronUp, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    profile, setSkinType, toggleConcern, setConcernPriority,
    setPersonalColor, setAllergies, saveProfile,
    setSkinSensitivity, setSkinCondition, setAgeGroup,
    toggleGoal, toggleAvoid, setNickname,
  } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [allergyInput, setAllergyInput] = useState(profile.allergies.join(', '));
  const [nicknameInput, setNicknameInput] = useState(profile.nickname ?? '');
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    await saveProfile();
    setSaved(true);
    toast({ title: '저장 완료', description: '프로필이 업데이트되었습니다.' });
    setTimeout(() => setSaved(false), 2000);
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
      <div className="gradient-brand px-5 pb-6 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-xl font-bold text-primary-foreground">내 프로필</h1>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-xs text-primary-foreground">
            <LogOut className="h-3.5 w-3.5" />로그아웃
          </button>
        </div>
        {/* 현재 프로필 요약 */}
        <div className="mt-3 rounded-xl bg-primary-foreground/10 p-3">
          {profile.nickname && (
            <p className="text-sm font-semibold text-primary-foreground mb-1.5">{profile.nickname}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {profile.ageGroup && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-primary-foreground">{AGE_GROUPS.find(a => a.value === profile.ageGroup)?.label}</span>}
            {profile.skinType && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-primary-foreground">{profile.skinType}</span>}
            {profile.skinSensitivity && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-primary-foreground">{SKIN_SENSITIVITIES.find(s => s.value === profile.skinSensitivity)?.label}</span>}
            {profile.skinConcerns.slice(0, 3).map(c => <span key={c} className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs text-primary-foreground">{c}</span>)}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-2 space-y-3">
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
              className="rounded-xl border-2 border-border"
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
                className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${profile.ageGroup === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="피부 타입">
          <div className="grid grid-cols-2 gap-2">
            {SKIN_TYPES.map(type => (
              <button key={type} onClick={() => setSkinType(type)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${profile.skinType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {type}
              </button>
            ))}
          </div>
        </Section>

        <Section title="유수분 상태" defaultOpen={false}>
          <div className="space-y-2">
            {SKIN_CONDITIONS.map(({ value, label, desc }) => (
              <button key={value} onClick={() => setSkinCondition(value)}
                className={`w-full rounded-xl border-2 p-3 text-left transition-all ${profile.skinCondition === value ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <p className={`text-sm font-semibold ${profile.skinCondition === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="피부 민감도" defaultOpen={false}>
          <div className="space-y-2">
            {SKIN_SENSITIVITIES.map(({ value, label, desc }) => (
              <button key={value} onClick={() => setSkinSensitivity(value)}
                className={`w-full rounded-xl border-2 p-3 text-left transition-all ${profile.skinSensitivity === value ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <p className={`text-sm font-semibold ${profile.skinSensitivity === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title="피부 고민 (우선순위 순)">
          <p className="text-xs text-muted-foreground">먼저 누른 순서가 우선순위예요</p>
          <div className="flex flex-wrap gap-2">
            {SKIN_CONCERNS.map(concern => {
              const priority = profile.concernPriority.indexOf(concern) + 1;
              return (
                <button key={concern} onClick={() => handleToggleConcern(concern)}
                  className={`relative rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all ${profile.skinConcerns.includes(concern) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                  {concern}
                  {priority > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{priority}</span>
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
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${profile.skinGoals.includes(g) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
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
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${profile.avoidIngredients.includes(a) ? 'border-danger/70 bg-danger/10 text-danger' : 'border-border text-foreground'}`}>
                {a}
              </button>
            ))}
          </div>
        </Section>

        <Section title="퍼스널컬러" defaultOpen={false}>
          <div className="grid grid-cols-3 gap-2">
            {PERSONAL_COLORS.map(color => (
              <button key={color} onClick={() => setPersonalColor(color)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${profile.personalColor === color ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>
                {color}
              </button>
            ))}
          </div>
        </Section>

        <Section title="알레르기 성분 (직접 입력)" defaultOpen={false}>
          <p className="text-xs text-muted-foreground">기피 성분 목록에 없는 특정 성분을 쉼표로 구분해 입력해주세요</p>
          <Input placeholder="예: 프로폴리스, 티트리오일" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} className="rounded-xl border-2 border-border" />
        </Section>

        <Button onClick={handleSave} className="w-full rounded-xl h-12 gradient-brand text-primary-foreground text-base font-semibold shadow-primary">
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
