import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { track, EVENT } from '@/lib/analytics';

const ChatFab = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) void track(EVENT.CHAT_OPENED);
  }, [open]);

  // 시트 열린 동안 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  return (
    <>
      {/* ── 플로팅 버튼 (BottomNav 위) ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="AI 피부 비서 열기"
        className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/15 active:scale-95 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-amber-900 ring-2 ring-white">
          AI
        </span>
      </button>

      {/* ── 시트(팝업) ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-xl flex flex-col animate-in slide-in-from-bottom duration-300 safe-bottom overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
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
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* 채팅 본문 */}
            <ChatPanel className="flex-1 min-h-0" variant="sheet" />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatFab;
