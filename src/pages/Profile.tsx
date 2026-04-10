import { useState } from 'react';
import { useUser, SKIN_TYPES, SKIN_CONCERNS, PERSONAL_COLORS } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Check, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { profile, setSkinType, toggleConcern, setPersonalColor, setAllergies, saveProfile } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [allergyInput, setAllergyInput] = useState(profile.allergies.join(', '));
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setAllergies(allergyInput.split(',').map(s => s.trim()).filter(Boolean));
    await saveProfile();
    setSaved(true);
    toast({ title: '저장 완료', description: '프로필이 업데이트되었습니다.' });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">내 프로필</h1>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />로그아웃
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-8 px-5">
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">피부 타입</h2>
          <div className="grid grid-cols-2 gap-2">
            {SKIN_TYPES.map(type => (
              <button key={type} onClick={() => setSkinType(type)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                  profile.skinType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                }`}>{type}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">피부 고민</h2>
          <div className="flex flex-wrap gap-2">
            {SKIN_CONCERNS.map(concern => (
              <button key={concern} onClick={() => toggleConcern(concern)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all ${
                  profile.skinConcerns.includes(concern) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                }`}>{concern}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">퍼스널컬러</h2>
          <div className="grid grid-cols-3 gap-2">
            {PERSONAL_COLORS.map(color => (
              <button key={color} onClick={() => setPersonalColor(color)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                  profile.personalColor === color ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                }`}>{color}</button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">알레르기 성분</h2>
          <Input placeholder="예: 향료, 파라벤" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} className="rounded-xl border-2 border-border" />
        </section>

        <Button onClick={handleSave} className="w-full rounded-xl gradient-primary text-primary-foreground">
          {saved ? <><Check className="mr-1 h-4 w-4" /> 저장됨</> : '저장하기'}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
