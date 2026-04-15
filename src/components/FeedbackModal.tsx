import { useState } from 'react';
import { Star, Bug, Lightbulb, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type FeedbackType = 'app_review' | 'bug_report' | 'feature_request';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ReactNode; placeholder: string }> = {
  app_review: {
    label: '전체 앱 리뷰',
    icon: <Star className="h-4 w-4" />,
    placeholder: '앱을 사용하면서 좋았던 점이나 개선이 필요한 점을 알려주세요.',
  },
  bug_report: {
    label: '버그 제보',
    icon: <Bug className="h-4 w-4" />,
    placeholder: '어떤 화면에서 어떤 문제가 발생했는지 구체적으로 알려주세요.',
  },
  feature_request: {
    label: '기능 제안',
    icon: <Lightbulb className="h-4 w-4" />,
    placeholder: '어떤 기능이 있으면 더 좋을지 자유롭게 제안해주세요.',
  },
};

const FeedbackModal = ({ open, onClose, defaultType = 'app_review' }: FeedbackModalProps) => {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!open) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: '내용을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (type === 'app_review' && rating === 0) {
      toast({ title: '별점을 선택해주세요', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('feedback' as never).insert({
        user_id: user?.id ?? null,
        type,
        rating: type === 'app_review' ? rating : null,
        message: message.trim(),
        metadata: {},
      });

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage('');
        setRating(0);
        setType('app_review');
      }, 1800);
    } catch {
      toast({ title: '제출 실패', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 shadow-xl">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="text-base font-semibold text-foreground">소중한 의견 감사합니다!</p>
            <p className="text-sm text-muted-foreground text-center">더 나은 BeautyLens를 만드는 데 반영하겠습니다.</p>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">의견 보내기</h2>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* 타입 선택 */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-medium transition-all ${
                    type === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {TYPE_CONFIG[t].icon}
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>

            {/* 별점 (앱 리뷰일 때만) */}
            {type === 'app_review' && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-foreground">만족도</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform active:scale-90"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-none text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 메시지 */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold text-foreground">내용</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={TYPE_CONFIG[type].placeholder}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{message.length} / 500</p>
            </div>

            {/* 제출 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-primary disabled:opacity-60"
            >
              {submitting ? '전송 중...' : '의견 보내기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
