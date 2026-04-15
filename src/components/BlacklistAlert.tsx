import { ShieldAlert, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  hits: string[]; // 블랙리스트와 겹친 성분명 목록
}

/**
 * 분석 결과 상단에 표시하는 블랙리스트 경보 배너
 * hits가 비어 있으면 렌더링하지 않음
 */
const BlacklistAlert = ({ hits }: Props) => {
  const navigate = useNavigate();
  if (hits.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/blacklist')}
      className="w-full flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3.5 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 mt-0.5">
        <ShieldAlert className="h-4 w-4 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-700">내 피부 블랙리스트 성분 포함!</p>
        <p className="mt-0.5 text-xs text-red-600 leading-relaxed">
          {hits.slice(0, 3).join(', ')}
          {hits.length > 3 ? ` 외 ${hits.length - 3}개` : ''}
        </p>
        <p className="mt-1 text-[10px] text-red-500">과거 분석에서 위험·주의 등급 받은 성분이에요</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-red-400 mt-1" />
    </button>
  );
};

export default BlacklistAlert;
