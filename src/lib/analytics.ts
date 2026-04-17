import { supabase } from '@/integrations/supabase/client';

// ─── 이벤트 이름 상수 ────────────────────────────────────────────────────────
export const EVENT = {
  // 분석
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  ANALYSIS_FAILED: 'analysis_failed',
  ANALYSIS_SHARED: 'analysis_shared',

  // 보관함
  CABINET_ADDED: 'cabinet_added',
  CABINET_RATED: 'cabinet_rated',
  CABINET_CONFLICT_SHOWN: 'cabinet_conflict_shown',

  // 일기
  DIARY_CREATED: 'diary_created',
  DIARY_VOICE_USED: 'diary_voice_used',

  // AI 코치
  COACH_REPORT_VIEWED: 'coach_report_viewed',
  SHOPPING_ADVICE_VIEWED: 'shopping_advice_viewed',

  // 네비게이션
  PAGE_VIEW: 'page_view',
  BOTTOM_NAV_CLICKED: 'bottom_nav_clicked',

  // 미션
  MISSION_COMPLETED: 'mission_completed',
  MISSION_CTA_CLICKED: 'mission_cta_clicked',

  // 알림
  PUSH_SUBSCRIBED: 'push_subscribed',
  PUSH_UNSUBSCRIBED: 'push_unsubscribed',

  // 커머스
  PRODUCT_VIEWED: 'product_viewed',
  PURCHASE_LINK_CLICKED: 'purchase_link_clicked',
  SIMILAR_SKIN_CLICKED: 'similar_skin_clicked',

  // 인증
  ONBOARDING_STEP: 'onboarding_step',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // AI 대화
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_REPLY_RECEIVED: 'chat_reply_received',
} as const;

export type EventName = typeof EVENT[keyof typeof EVENT];

// ─── 세션 ID (앱 실행 동안 고정) ──────────────────────────────────────────────
const SESSION_KEY = 'bl_session_id';
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ─── 이벤트 큐 (네트워크 실패 시 유실 방지) ───────────────────────────────────
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const queue: Array<{ user_id: string | null; event_name: string; event_props: Record<string, unknown> | null; session_id: string; created_at: string }> = [];

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await supabase.from('app_events' as never).insert(batch as never);
  } catch {
    // 실패 시 조용히 무시 (분석용 데이터이므로 앱 동작에 영향 없음)
  }
}

// ─── 공개 API ────────────────────────────────────────────────────────────────
export async function track(
  eventName: EventName | string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    queue.push({
      user_id: user?.id ?? null,
      event_name: eventName,
      event_props: props ?? null,
      session_id: getSessionId(),
      created_at: new Date().toISOString(),
    });

    // 배치 처리: 200ms 내 여러 이벤트는 한 번에 전송
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 200);

    // 큐가 10개 이상이면 즉시 flush
    if (queue.length >= 10) {
      if (flushTimer) clearTimeout(flushTimer);
      flush();
    }
  } catch {
    /* ignore */
  }
}

// ─── 페이지 진입 시 1회 자동 추적용 훅 ────────────────────────────────────────
export function trackPageView(pathname: string, extra?: Record<string, unknown>) {
  track(EVENT.PAGE_VIEW, { pathname, ...extra });
}

// ─── 페이지 언로드 시 flush ──────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flush();
  });
}
