-- Twitter 포스팅 로그 테이블
CREATE TABLE IF NOT EXISTS twitter_post_logs (
  id              BIGSERIAL PRIMARY KEY,
  tweet_id        TEXT,
  content         TEXT,
  content_type    TEXT,
  posted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'success',
  error_message   TEXT,
  likes           INTEGER DEFAULT 0,
  retweets        INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_twitter_logs_posted_at ON twitter_post_logs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_logs_status    ON twitter_post_logs(status);

-- 공유 이벤트 로그 테이블
CREATE TABLE IF NOT EXISTS share_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  product_name TEXT,
  skin_fit_score INTEGER,
  shared_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_type ON share_events(event_type);
CREATE INDEX IF NOT EXISTS idx_share_events_date ON share_events(shared_at DESC);

ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own share events"
  ON share_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- pg_cron, pg_net 확장
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 스케줄 정리
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'post-twitter-morning') THEN
    PERFORM cron.unschedule('post-twitter-morning');
  END IF;
END $$;

-- 매일 KST 08:00 (UTC 23:00) 자동 포스팅
SELECT cron.schedule(
  'post-twitter-morning',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://qmlahovojjhkfmloifjc.supabase.co/functions/v1/post-twitter-content',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbGFob3Zvampoa2ZtbG9pZmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODMzMjYsImV4cCI6MjA5MTM1OTMyNn0.a4mZFXkK3xjZYHib30_afE_uA6ok_GOwhiggKqS-rhw'
    ),
    body    := '{}'::jsonb
  );
  $$
);
