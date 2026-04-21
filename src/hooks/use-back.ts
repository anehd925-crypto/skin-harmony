import { useNavigate } from 'react-router-dom';

/**
 * navigate(-1) 대체 훅.
 * 브라우저 히스토리 스택이 있으면 뒤로, 없으면(딥링크·새 탭·리다이렉트 직후) fallback 경로로 이동.
 */
export const useBack = (fallback = '/') => {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
};
