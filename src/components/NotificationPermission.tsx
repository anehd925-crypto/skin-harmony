import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, X } from 'lucide-react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const NotificationPermission = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      checkExistingSubscription();
    }
    // 이전에 닫기 눌렀으면 숨김
    const saved = sessionStorage.getItem('push-banner-dismissed');
    if (saved) setDismissed(true);
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator) || !user) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setSubscribed(true);
    } catch { /* ignore */ }
  };

  const handleEnable = async () => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID 공개키가 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: (subJson.keys as { p256dh: string; auth: string }).p256dh,
        auth: (subJson.keys as { p256dh: string; auth: string }).auth,
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;
      setSubscribed(true);
    } catch (e) {
      console.error('푸시 구독 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      }
      setSubscribed(false);
    } catch (e) {
      console.error('구독 해제 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('push-banner-dismissed', '1');
  };

  // 지원 안 되는 환경 숨김
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  // 로그인 안 한 경우 숨김
  if (!user) return null;
  // 닫기 눌렀으면 숨김
  if (dismissed) return null;
  // 이미 구독 중이면 숨김
  if (subscribed) return null;
  // 이미 거부했으면 숨김
  if (permission === 'denied') return null;

  return (
    <div className="mx-5 mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">할인 알림 받기</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            찜한 상품이 할인되면 즉시 알림을 드려요.
          </p>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="mt-2.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? '설정 중...' : '알림 켜기'}
          </button>
        </div>
        <button onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export { NotificationPermission };
export default NotificationPermission;
