import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // onboarding_complete 컬럼으로 신규/기존 유저 판단 (created_at 15초 판단 제거)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const isOnboardingDone = profileData?.onboarding_complete === true;

        if (!isOnboardingDone) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
      // INITIAL_SESSION은 무시 — OAuth code 교환 전에 발생할 수 있어 오처리 위험
    });

    // 10초 내 SIGNED_IN 없으면 현재 세션 확인 후 이동
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/', { replace: true });
      } else {
        setMessage('로그인에 실패했습니다. 다시 시도해주세요.');
        setTimeout(() => navigate('/auth'), 2000);
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-primary">BeautyLens</span>
      </div>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default AuthCallback;
