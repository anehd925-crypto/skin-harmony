import { useEffect, useState } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { track, EVENT } from '@/lib/analytics';

/**
 * 홈 우측 하단에 상시 표시되는 AI 피부 비서 진입점.
 *
 * 직관성 강화:
 * - 단순 말풍선 아이콘이 아니라 "AI 비서 · 물어보기" 캡슐(pill) 형태로 노출
 * - Sparkles + MessageCircle 조합으로 "AI 대화" 맥락을 시각적으로 전달
 * - 시트 z-index는 BottomNav(z-50)보다 높은 z-[60]을 사용해
 *   바텀 내비게이션이 입력창을 가리지 않도록 보장한다.
 */
const ChatFab = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) void track(EVENT.CHAT_OPENED);
  }, [open]);

  // 시트 열린 동안 페이지 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  return (
    <>
      {/* ── 플로팅 캡슐 버튼 ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="AI 피부 비서에게 물어보기"
        className="
          fixed right-4 bottom-24 z-40
          inline-flex items-center gap-2
          rounded-full pl-3 pr-4 py-3
          bg-primary text-primary-foreground
          shadow-lg ring-4 ring-primary/15
          active:scale-95 transition-transform
          hover:brightness-110
        "
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <MessageCircle className="h-4 w-4" />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-300 drop-shadow" />
        </span>
        <span className="text-sm font-bold leading-none">AI에게 물어보기</span>
      </button>

      {/* ── 대화 시트 (BottomNav보다 위) ── */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="
              relative w-full h-[88vh] max-h-[88vh]
              bg-white rounded-t-3xl shadow-xl
              flex flex-col
              animate-in slide-in-from-bottom duration-300
              overflow-hidden
            "
          >
            {/* 헤더 (고정) */}
            <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">AI 피부 비서</p>
                  <p className="text-[11px] text-muted-foreground">언제든지 피부에 대해 물어보세요</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* 채팅 본문 (메시지 영역은 flex-1, 입력창은 shrink-0 고정) */}
            <ChatPanel className="flex-1 min-h-0" variant="sheet" />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatFab;
