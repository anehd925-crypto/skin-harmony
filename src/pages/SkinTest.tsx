import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import SkinTypeDecider, { type DiagnosisResult } from '@/components/SkinTypeDecider';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  saveSkinTest, loadSkinTestAnswers, loadSkinTestResult,
} from '@/utils/skinTestStorage';

const SkinTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSkinType, setSkinCondition, setSkinSensitivity, saveProfile } = useUser();
  const { toast } = useToast();

  const [initialAnswers, setInitialAnswers] = useState<Record<string, string> | null>(null);
  const [initialResult, setInitialResult] = useState<DiagnosisResult | null>(null);
  const [latestAnswers, setLatestAnswers] = useState<Record<string, string> | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // 이전 진단 답변·결과 prefill
  useEffect(() => {
    if (!user) return;
    const prevAnswers = loadSkinTestAnswers(user.id);
    const prevResult = loadSkinTestResult(user.id);
    if (prevAnswers) setInitialAnswers(prevAnswers);
    if (prevResult) {
      setInitialResult(prevResult);
      setResult(prevResult);
    }
  }, [user]);

  const applyToProfile = async () => {
    if (!result || !user) return;
    setSkinType(result.skinType);
    setSkinCondition(result.skinCondition);
    setSkinSensitivity(result.skinSensitivity);
    try {
      await saveProfile({
        skinType: result.skinType,
        skinCondition: result.skinCondition,
        skinSensitivity: result.skinSensitivity,
      });
      saveSkinTest(user.id, latestAnswers ?? initialAnswers ?? {}, result);
      setApplied(true);
      toast({
        title: '프로필에 반영했어요',
        description: `${result.skinType} · ${conditionLabel(result.skinCondition)} · ${sensitivityLabel(result.skinSensitivity)}`,
      });
    } catch {
      toast({ title: '반영 실패', variant: 'destructive' });
    }
  };

  const handleRestart = () => {
    setResult(null);
    setInitialResult(null);
    setApplied(false);
    setRestartKey(k => k + 1);
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
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">피부 타입 진단</h1>
          <p className="text-[11px] text-muted-foreground">
            6문항으로 피부 타입·유수분·민감도가 한 번에 결정돼요
          </p>
        </div>
        {result && (
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" /> 다시
          </button>
        )}
      </div>

      <div className="px-4 pt-6 pb-8">
        <SkinTypeDecider
          key={restartKey}
          variant="full"
          initialAnswers={initialAnswers}
          initialResult={initialResult}
          onResolved={(r, ans) => { setResult(r); setLatestAnswers(ans); setApplied(false); }}
          onRestart={handleRestart}
        />

        {result && (
          <div className="mt-4">
            {!applied ? (
              <button
                onClick={applyToProfile}
                className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground"
              >
                이 결과를 내 프로필에 반영하기
              </button>
            ) : (
              <button disabled className="w-full rounded-xl bg-green-500 py-4 text-sm font-bold text-white">
                반영 완료
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

// 라벨 헬퍼 (UserContext의 enum 라벨과 일치)
const conditionLabel = (v: DiagnosisResult['skinCondition']) =>
  ({ very_dry: '매우 건조', dry: '건조한 편', normal: '보통', oily: '약간 번들', very_oily: '많이 번들' }[v]);
const sensitivityLabel = (v: DiagnosisResult['skinSensitivity']) =>
  ({ very_sensitive: '매우 민감', sensitive: '민감한 편', normal: '보통', resilient: '강한 편' }[v]);

export default SkinTest;
