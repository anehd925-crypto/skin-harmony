import type { DiagnosisResult } from '@/components/SkinTypeDecider';

/**
 * 피부 진단 답변·결과 캐시.
 * - DB에는 결과(skin_type, skin_condition, skin_sensitivity)만 저장하지만,
 *   "재진단" 경험을 위해 직전 답변과 진단 결과 메타를 사용자별 localStorage에 보관한다.
 * - 디바이스 변경 시에는 사라질 수 있으나, 그때는 처음부터 다시 진단하면 된다.
 */

const ANSWERS_KEY = (uid: string) => `bl.skin_test.answers.${uid}`;
const RESULT_KEY = (uid: string) => `bl.skin_test.result.${uid}`;

export const saveSkinTest = (
  userId: string,
  answers: Record<string, string>,
  result: DiagnosisResult,
) => {
  try {
    localStorage.setItem(ANSWERS_KEY(userId), JSON.stringify(answers));
    localStorage.setItem(RESULT_KEY(userId), JSON.stringify(result));
  } catch {
    // QuotaExceeded 등은 무시 (UX에 영향 없음)
  }
};

export const loadSkinTestAnswers = (userId: string): Record<string, string> | null => {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const loadSkinTestResult = (userId: string): DiagnosisResult | null => {
  try {
    const raw = localStorage.getItem(RESULT_KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as DiagnosisResult;
  } catch {
    return null;
  }
};

export const clearSkinTest = (userId: string) => {
  try {
    localStorage.removeItem(ANSWERS_KEY(userId));
    localStorage.removeItem(RESULT_KEY(userId));
  } catch { /* ignore */ }
};
