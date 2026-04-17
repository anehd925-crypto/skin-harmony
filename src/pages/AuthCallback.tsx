import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    let handled = false;

    const handleSession = async (userId: string) => {
      if (handled) return;
      handled = true;

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('onboarding_complete, created_at')
          .eq('user_id', userId)
          .maybeSingle();

        // 프로필 조회 오류(네트워크·RLS 등) 시에는 안전하게 홈으로 이동하고,
        // 정상 응답에서 onboarding_complete === false인 경우만 온보딩으로 보낸다.
        if (error) {
          console.error('[AuthCallback] profile fetch failed:', error.message);
          navigate('/', { replace: true });
          return;
        }

        const shouldOnboard = profileData !== null && profileData?.onboarding_complete === false;
        navigate(shouldOnboard ? '/onboarding' : '/', { replace: true });
      } catch (e) {
        console.error('[AuthCallback] session handling failed:', e);
        navigate('/', { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        await handleSession(session.user.id);
      }
    });

    // 페이지 재진입 등 이미 세션이 있는 경우 즉시 처리
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user?.id) {
          await handleSession(session.user.id);
        }
      })
      .catch((e) => {
        console.error('[AuthCallback] getSession failed:', e);
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
