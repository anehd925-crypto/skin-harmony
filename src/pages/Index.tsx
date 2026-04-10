import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import Home from './Home';

const Index = () => {
  const { profile } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/onboarding', { replace: true });
    }
  }, [profile.onboardingComplete, navigate]);

  if (!profile.onboardingComplete) return null;

  return <Home />;
};

export default Index;
