-- 유저 피드백 테이블
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('app_review', 'bug_report', 'feature_request', 'analysis_result')),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 로그인 유저는 피드백 제출 가능
CREATE POLICY "users can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 본인 피드백만 조회 가능
CREATE POLICY "users can view own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
