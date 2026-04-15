import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const SKIN_TYPES = ['건성', '지성', '복합성', '민감성'] as const;
export const SKIN_CONCERNS = ['모공', '주름', '색소침착', '여드름', '건조', '탄력', '민감', '홍조'] as const;
export const PERSONAL_COLORS = ['봄웜', '여름쿨', '가을웜', '겨울쿨', '모름'] as const;

export const SKIN_SENSITIVITIES = [
  { value: 'very_sensitive', label: '매우 민감', desc: '조금만 자극받아도 붉어지거나 따가워요' },
  { value: 'sensitive',      label: '민감한 편', desc: '새 제품 쓸 때 종종 반응이 생겨요' },
  { value: 'normal',         label: '보통',      desc: '대부분의 제품을 무리 없이 써요' },
  { value: 'resilient',      label: '강한 편',   desc: '웬만한 성분에 잘 반응하지 않아요' },
] as const;

export const SKIN_CONDITIONS = [
  { value: 'very_dry',  label: '매우 건조', desc: '당김·각질·트터짐이 자주 생겨요' },
  { value: 'dry',       label: '건조한 편', desc: '오후엔 당기고 보습이 부족해요' },
  { value: 'normal',    label: '보통',      desc: '계절에 따라 약간씩 달라요' },
  { value: 'oily',      label: '약간 번들', desc: '오후에 T존이 번들거려요' },
  { value: 'very_oily', label: '많이 번들', desc: '세안 후 1~2시간 내 번들거려요' },
] as const;

export const AGE_GROUPS = [
  { value: '10s',      label: '10대' },
  { value: '20s',      label: '20대' },
  { value: '30s',      label: '30대' },
  { value: '40s',      label: '40대' },
  { value: '50s_plus', label: '50대 이상' },
] as const;

export const SKIN_GOALS = [
  '수분 충전', '모공 관리', '미백·톤업', '주름 개선', '트러블 진정',
  '피부 장벽 강화', '탄력', '각질 제거', '자외선 차단', '자연스러운 메이크업',
] as const;

export const AVOID_INGREDIENTS = [
  '알코올', '향료', '파라벤', '설페이트', '실리콘',
  '미네랄오일', '인공색소', '포름알데히드 유발체', '레티놀(임산부)', '살리실산',
] as const;

export const SPECIAL_CONDITIONS = [
  { value: 'none',          label: '해당 없음',     desc: '특별한 피부 조건이 없어요' },
  { value: 'pregnant',      label: '임신·수유 중',  desc: '임산부/수유부 금기 성분을 강화 체크해요' },
  { value: 'atopy',         label: '아토피',        desc: '아토피 피부염 악화 성분을 집중 체크해요' },
  { value: 'rosacea',       label: '로사세아',      desc: '혈관 확장·홍조 유발 성분을 체크해요' },
  { value: 'sensitive_skin', label: '극건성·민감',  desc: '극도로 예민하고 건조한 피부예요' },
] as const;

export type SpecialCondition = typeof SPECIAL_CONDITIONS[number]['value'];

export type SkinType = typeof SKIN_TYPES[number];
export type SkinConcern = typeof SKIN_CONCERNS[number];
export type PersonalColor = typeof PERSONAL_COLORS[number];
export type SkinSensitivity = typeof SKIN_SENSITIVITIES[number]['value'];
export type SkinCondition = typeof SKIN_CONDITIONS[number]['value'];
export type AgeGroup = typeof AGE_GROUPS[number]['value'];
export type SkinGoal = typeof SKIN_GOALS[number];
export type AvoidIngredient = typeof AVOID_INGREDIENTS[number];

export interface UserProfile {
  skinType: SkinType | null;
  skinConcerns: SkinConcern[];
  personalColor: PersonalColor | null;
  allergies: string[];
  onboardingComplete: boolean;
  nickname: string;
  // 확장 필드
  skinSensitivity: SkinSensitivity;
  skinCondition: SkinCondition;
  ageGroup: AgeGroup | '';
  skinGoals: SkinGoal[];
  avoidIngredients: AvoidIngredient[];
  concernPriority: SkinConcern[];
  specialCondition: SpecialCondition;
}

interface UserContextType {
  profile: UserProfile;
  loading: boolean;
  setSkinType: (type: SkinType) => void;
  toggleConcern: (concern: SkinConcern) => void;
  setPersonalColor: (color: PersonalColor) => void;
  setAllergies: (allergies: string[]) => void;
  setSkinSensitivity: (v: SkinSensitivity) => void;
  setSkinCondition: (v: SkinCondition) => void;
  setAgeGroup: (v: AgeGroup | '') => void;
  toggleGoal: (g: SkinGoal) => void;
  toggleAvoid: (a: AvoidIngredient) => void;
  setConcernPriority: (list: SkinConcern[]) => void;
  setNickname: (n: string) => void;
  setSpecialCondition: (v: SpecialCondition) => void;
  completeOnboarding: () => Promise<void>;
  saveProfile: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  skinType: null,
  skinConcerns: [],
  personalColor: null,
  allergies: [],
  onboardingComplete: false,
  nickname: '',
  skinSensitivity: 'normal',
  skinCondition: 'normal',
  ageGroup: '',
  skinGoals: [],
  avoidIngredients: [],
  concernPriority: [],
  specialCondition: 'none',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('프로필 로드 오류:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile({
          skinType: (data.skin_type as SkinType) ?? null,
          skinConcerns: (data.skin_concerns as SkinConcern[]) ?? [],
          personalColor: (data.personal_color as PersonalColor) ?? null,
          allergies: (data.allergies as string[]) ?? [],
          onboardingComplete: data.onboarding_complete ?? false,
          nickname: (data as { nickname?: string }).nickname ?? '',
          skinSensitivity: (data.skin_sensitivity as SkinSensitivity) ?? 'normal',
          skinCondition: (data.skin_condition as SkinCondition) ?? 'normal',
          ageGroup: (data.age_group as AgeGroup) ?? '',
          skinGoals: (data.skin_goals as SkinGoal[]) ?? [],
          avoidIngredients: (data.avoid_ingredients as AvoidIngredient[]) ?? [],
          concernPriority: (data.concern_priority as SkinConcern[]) ?? [],
          specialCondition: (data.special_condition as SpecialCondition) ?? 'none',
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
  const setSkinSensitivity = (v: SkinSensitivity) => setProfile(p => ({ ...p, skinSensitivity: v }));
  const setSkinCondition = (v: SkinCondition) => setProfile(p => ({ ...p, skinCondition: v }));
  const setAgeGroup = (v: AgeGroup | '') => setProfile(p => ({ ...p, ageGroup: v }));
  const toggleGoal = (g: SkinGoal) => {
    setProfile(p => ({
      ...p,
      skinGoals: p.skinGoals.includes(g) ? p.skinGoals.filter(x => x !== g) : [...p.skinGoals, g],
    }));
  };
  const toggleAvoid = (a: AvoidIngredient) => {
    setProfile(p => ({
      ...p,
      avoidIngredients: p.avoidIngredients.includes(a)
        ? p.avoidIngredients.filter(x => x !== a)
        : [...p.avoidIngredients, a],
    }));
  };
  const setConcernPriority = (list: SkinConcern[]) => setProfile(p => ({ ...p, concernPriority: list }));
  const setNickname = (n: string) => setProfile(p => ({ ...p, nickname: n }));
  const setSpecialCondition = (v: SpecialCondition) => setProfile(p => ({ ...p, specialCondition: v }));

  const buildDbPayload = (p: UserProfile) => ({
    skin_type: p.skinType,
    skin_concerns: p.skinConcerns,
    personal_color: p.personalColor,
    allergies: p.allergies,
    onboarding_complete: p.onboardingComplete,
    nickname: p.nickname,
    skin_sensitivity: p.skinSensitivity,
    skin_condition: p.skinCondition,
    age_group: p.ageGroup,
    skin_goals: p.skinGoals,
    avoid_ingredients: p.avoidIngredients,
    concern_priority: p.concernPriority,
    special_condition: p.specialCondition,
  });

  const upsertProfile = async (payload: ReturnType<typeof buildDbPayload>, userId: string) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from('profiles').update(payload).eq('user_id', userId);
      if (error) console.error('[UserContext] 프로필 업데이트 실패:', error.message);
      return error;
    } else {
      const { error } = await supabase.from('profiles').insert({ ...payload, user_id: userId });
      if (error) console.error('[UserContext] 프로필 생성 실패:', error.message);
      return error;
    }
  };

  const saveProfile = useCallback(async () => {
    if (!user) return;
    const err = await upsertProfile(buildDbPayload(profile), user.id);
    if (err) throw new Error(err.message);
  }, [user, profile]);

  const completeOnboarding = async () => {
    const next = { ...profile, onboardingComplete: true };
    setProfile(next);
    if (!user) return;
    await upsertProfile(buildDbPayload(next), user.id);
  };

  return (
    <UserContext.Provider value={{
      profile, loading,
      setSkinType, toggleConcern, setPersonalColor, setAllergies,
      setSkinSensitivity, setSkinCondition, setAgeGroup,
      toggleGoal, toggleAvoid, setConcernPriority, setNickname, setSpecialCondition,
      completeOnboarding, saveProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
