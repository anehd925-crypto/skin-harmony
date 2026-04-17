import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { track, EVENT } from '@/lib/analytics';
import { Bell, BellOff, Sun, Moon, FileText, Tag, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

interface NotifyPrefs {
  notify_morning_routine: boolean;
  notify_evening_routine: boolean;
  notify_weekly_report: boolean;
  notify_sale_alerts: boolean;
  notify_blacklist_alerts: boolean;
}

const defaults: NotifyPrefs = {
  notify_morning_routine: true,
  notify_evening_routine: true,
  notify_weekly_report: true,
  notify_sale_alerts: true,
  notify_blacklist_alerts: true,
};

const NotificationSettingsCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotifyPrefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('notify_morning_routine, notify_evening_routine, notify_weekly_report, notify_sale_alerts, notify_blacklist_alerts')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setPrefs({ ...defaults, ...(data as NotifyPrefs) });
    if (supported) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, [user, supported]);

  useEffect(() => { void loadPrefs(); }, [loadPrefs]);

  const enable = async () => {
    if (!user || !supported) return;
    if (!VAPID_PUBLIC_KEY) {
      toast({ title: '설정 오류', description: 'VAPID 키가 설정되지 않았어요.', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast({ title: '권한이 필요해요', description: '브라우저 설정에서 알림을 허용해주세요.' });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const subJson = sub.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: (subJson.keys as { p256dh: string; auth: string }).p256dh,
        auth: (subJson.keys as { p256dh: string; auth: string }).auth,
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'user_id,endpoint' });
      setSubscribed(true);
      track(EVENT.PUSH_SUBSCRIBED);
      toast({ title: '알림이 켜졌어요' });
    } catch (e) {
      toast({ title: '알림 설정 실패', description: String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const disable = async () => {
    if (!user || !supported) return;
    setActionLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint);
      }
      setSubscribed(false);
      track(EVENT.PUSH_UNSUBSCRIBED);
      toast({ title: '알림이 꺼졌어요' });
    } catch {
      toast({ title: '해제 실패', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const togglePref = async (key: keyof NotifyPrefs) => {
    if (!user) return;
    const prev = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error } = await supabase.from('profiles').update({ [key]: next[key] }).eq('user_id', user.id);
    if (error) {
      // 서버 저장 실패 시 UI 상태를 원복하고 사용자에게 알린다.
      setPrefs(prev);
      toast({
        title: '설정 저장 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!user || loading) return null;
  if (!supported) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">이 브라우저는 푸시 알림을 지원하지 않아요.</p>
      </div>
    );
  }

  const items: Array<{ key: keyof NotifyPrefs; Icon: typeof Bell; label: string; sub: string }> = [
    { key: 'notify_morning_routine', Icon: Sun, label: '아침 루틴 알림', sub: '오전 7시 · 아침 루틴 리마인드' },
    { key: 'notify_evening_routine', Icon: Moon, label: '저녁 루틴 알림', sub: '밤 10시 · 저녁 루틴 리마인드' },
    { key: 'notify_weekly_report', Icon: FileText, label: '주간 피부 리포트', sub: '매주 일요일 · AI 코치 요약' },
    { key: 'notify_sale_alerts', Icon: Tag, label: '할인 알림', sub: '찜한 제품 할인 시' },
    { key: 'notify_blacklist_alerts', Icon: ShieldAlert, label: '성분 경보', sub: '블랙리스트 성분 감지 시' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">알림 설정</h2>
        </div>
        {subscribed ? (
          <button
            onClick={disable}
            disabled={actionLoading}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-muted-foreground disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3" />}
            해제
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={actionLoading}
            className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            알림 켜기
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {items.map(({ key, Icon, label, sub }) => (
          <div key={key} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <button
              onClick={() => togglePref(key)}
              disabled={!subscribed}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                prefs[key] && subscribed ? 'bg-primary' : 'bg-neutral-200'
              } disabled:opacity-40`}
              aria-pressed={prefs[key]}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  prefs[key] && subscribed ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {!subscribed && (
        <div className="px-4 py-3 border-t border-border bg-amber-50">
          <p className="text-xs text-amber-800">
            알림을 켜야 위 항목들이 활성화됩니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsCard;
