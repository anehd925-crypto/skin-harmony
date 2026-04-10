import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const SKIN_TYPES = ['건성', '지성', '복합성', '민감성'] as const;
export const SKIN_CONCERNS = ['모공', '주름', '색소침착', '여드름', '건조', '탄력', '민감', '홍조'] as const;
export const PERSONAL_COLORS = ['봄웜', '여름쿨', '가을웜', '겨울쿨', '모름'] as const;

export type SkinType = typeof SKIN_TYPES[number];
export type SkinConcern = typeof SKIN_CONCERNS[number];
export type PersonalColor = typeof PERSONAL_COLORS[number];

export interface UserProfile {
  skinType: SkinType | null;
  skinConcerns: SkinConcern[];
  personalColor: PersonalColor | null;
  allergies: string[];
  onboardingComplete: boolean;
}

interface UserContextType {
  profile: UserProfile;
  loading: boolean;
  setSkinType: (type: SkinType) => void;
  toggleConcern: (concern: SkinConcern) => void;
  setPersonalColor: (color: PersonalColor) => void;
  setAllergies: (allergies: string[]) => void;
  completeOnboarding: () => Promise<void>;
  saveProfile: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  skinType: null,
  skinConcerns: [],
  personalColor: null,
  allergies: [],
  onboardingComplete: false,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  // Load profile from DB
  useEffect(() => {
    if (!user) {
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile({
          skinType: (data.skin_type as SkinType) ?? null,
          skinConcerns: (data.skin_concerns as SkinConcern[]) ?? [],
          personalColor: (data.personal_color as PersonalColor) ?? null,
          allergies: (data.allergies as string[]) ?? [],
          onboardingComplete: data.onboarding_complete ?? false,
        });
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const setSkinType = (type: SkinType) => setProfile(p => ({ ...p, skinType: type }));

  const toggleConcern = (concern: SkinConcern) => {
    setProfile(p => ({
      ...p,
      skinConcerns: p.skinConcerns.includes(concern)
        ? p.skinConcerns.filter(c => c !== concern)
        : [...p.skinConcerns, concern],
    }));
  };

  const setPersonalColor = (color: PersonalColor) => setProfile(p => ({ ...p, personalColor: color }));
  const setAllergies = (allergies: string[]) => setProfile(p => ({ ...p, allergies }));

  const saveProfile = useCallback(async () => {
    if (!user) return;
    await supabase.from('profiles').update({
      skin_type: profile.skinType,
      skin_concerns: profile.skinConcerns,
      personal_color: profile.personalColor,
      allergies: profile.allergies,
      onboarding_complete: profile.onboardingComplete,
    }).eq('user_id', user.id);
  }, [user, profile]);

  const completeOnboarding = async () => {
    setProfile(p => ({ ...p, onboardingComplete: true }));
    if (!user) return;
    await supabase.from('profiles').update({
      skin_type: profile.skinType,
      skin_concerns: profile.skinConcerns,
      personal_color: profile.personalColor,
      allergies: profile.allergies,
      onboarding_complete: true,
    }).eq('user_id', user.id);
  };

  return (
    <UserContext.Provider value={{ profile, loading, setSkinType, toggleConcern, setPersonalColor, setAllergies, completeOnboarding, saveProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
