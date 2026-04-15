-- pg_cron 확장 활성화 (이미 활성화된 경우 무시)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 job 있으면 삭제 후 재등록
SELECT cron.unschedule('send-push-notification-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-push-notification-daily'
);

-- 매일 한국시간 09:00 (UTC 00:00) 에 실행
SELECT cron.schedule(
  'send-push-notification-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
