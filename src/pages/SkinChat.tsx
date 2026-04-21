import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBack } from '@/hooks/use-back';
import BottomNav from '@/components/BottomNav';
import ChatPanel from '@/components/ChatPanel';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { track, EVENT } from '@/lib/analytics';

const SkinChat = () => {
  const navigate = useNavigate();
  const goBack = useBack('/');
  const { profile } = useUser();

  useEffect(() => {
    void track(EVENT.CHAT_OPENED);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button
          onClick={goBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">AI 피부 비서</h1>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {profile.skinType ? `${profile.skinType} 피부에 맞춘 대화` : '피부 상담을 시작해보세요'}
          </p>
        </div>
      </div>

      <ChatPanel className="flex-1 pb-24" variant="page" />

      <BottomNav />
    </div>
  );
};

export default SkinChat;
