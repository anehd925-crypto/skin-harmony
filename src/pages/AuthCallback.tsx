import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    let handled = false;

    const handleSession = async (session: { user: { id: string; created_at: string } }) => {
      if (handled) return;
      handled = true;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_complete, created_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // 프로필이 없거나 onboarding_complete가 명시적으로 false인 경우만 온보딩으로 이동
        // null / undefined는 기존 유저로 간주해 홈으로 이동
        const shouldOnboard = profileData !== null && profileData?.onboarding_complete === false;

        if (shouldOnboard) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch {
        navigate('/', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await handleSession(session.user as { id: string; created_at: string });
      }
    });

    // 현재 이미 세션이 있는 경우 (페이지 재진입 등) 즉시 처리
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await handleSession(session.user as { id: string; created_at: string });
      }
    });

    // 15초 내 처리 안되면 홈으로 이동
    const timeout = setTimeout(() => {
      if (!handled) {
        handled = true;
        setMessage('로그인 처리 중 문제가 발생했습니다. 홈으로 이동합니다.');
        setTimeout(() => navigate('/'), 1500);
      }
    }, 15_000);

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
