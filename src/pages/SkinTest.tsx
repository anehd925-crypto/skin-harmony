import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import SkinTypeDecider, { type DiagnosisResult } from '@/components/SkinTypeDecider';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SkinTest = () => {
  const navigate = useNavigate();
  const { setSkinType, setSkinSensitivity, saveProfile } = useUser();
  const { toast } = useToast();

  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [applied, setApplied] = useState(false);

  const applyToProfile = async () => {
    if (!result) return;
    setSkinType(result.skinType);
    if (result.skinTypeEn === 'sensitive') setSkinSensitivity('sensitive');
    try {
      await saveProfile();
      setApplied(true);
      toast({ title: '프로필에 반영했어요', description: `피부 타입: ${result.skinType}` });
    } catch {
      toast({ title: '반영 실패', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-base font-bold text-foreground">피부 타입 진단</h1>
      </div>

      <div className="px-4 pt-6 pb-8">
        <SkinTypeDecider
          variant="full"
          onResolved={(r) => { setResult(r); setApplied(false); }}
          onRestart={() => { setResult(null); setApplied(false); }}
          initialResult={result}
        />

        {result && (
          <div className="mt-4">
            {!applied ? (
              <button
                onClick={applyToProfile}
                className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground"
              >
                프로필에 반영하기
              </button>
            ) : (
              <button disabled className="w-full rounded-xl bg-green-500 py-4 text-sm font-bold text-white">
                프로필에 반영 완료
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SkinTest;
