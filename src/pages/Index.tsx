import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import Home from './Home';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!profile.onboardingComplete) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, authLoading, profileLoading, profile.onboardingComplete, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile.onboardingComplete) return null;

  return <Home />;
};

export default Index;
