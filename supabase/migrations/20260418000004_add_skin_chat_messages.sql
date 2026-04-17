-- ════════════════════════════════════════════════════════════════════════════
-- 홈 AI 대화창: skin_chat_messages 테이블 + RLS 정책
-- Phase 3: 사용자-AI 피부 상담 대화 로그
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skin_chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skin_chat_messages_user_created_idx
  ON skin_chat_messages (user_id, created_at DESC);

ALTER TABLE skin_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own chat messages read"   ON skin_chat_messages;
DROP POLICY IF EXISTS "own chat messages write"  ON skin_chat_messages;
DROP POLICY IF EXISTS "own chat messages delete" ON skin_chat_messages;

CREATE POLICY "own chat messages read"
  ON skin_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own chat messages write"
  ON skin_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own chat messages delete"
  ON skin_chat_messages FOR DELETE
  USING (auth.uid() = user_id);
