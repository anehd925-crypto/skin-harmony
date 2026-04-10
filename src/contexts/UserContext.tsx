import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, SkinType, SkinConcern, PersonalColor } from '@/data/mockData';

interface UserContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setSkinType: (type: SkinType) => void;
  toggleConcern: (concern: SkinConcern) => void;
  setPersonalColor: (color: PersonalColor) => void;
  setAllergies: (allergies: string[]) => void;
  completeOnboarding: () => void;
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
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('beautyProfile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  useEffect(() => {
    localStorage.setItem('beautyProfile', JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const setSkinType = (type: SkinType) => updateProfile({ skinType: type });

  const toggleConcern = (concern: SkinConcern) => {
    setProfile(prev => ({
      ...prev,
      skinConcerns: prev.skinConcerns.includes(concern)
        ? prev.skinConcerns.filter(c => c !== concern)
        : [...prev.skinConcerns, concern],
    }));
  };

  const setPersonalColor = (color: PersonalColor) => updateProfile({ personalColor: color });
  const setAllergies = (allergies: string[]) => updateProfile({ allergies });
  const completeOnboarding = () => updateProfile({ onboardingComplete: true });

  return (
    <UserContext.Provider value={{ profile, updateProfile, setSkinType, toggleConcern, setPersonalColor, setAllergies, completeOnboarding }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
