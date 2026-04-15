import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Mail, Lock, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      toast({ title: '구글 로그인 실패', description: error.message, variant: 'destructive' });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    } else if (!isLogin) {
      toast({ title: '가입 완료', description: '이메일 인증 후 로그인해주세요.' });
      setIsLogin(true);
    } else {
      navigate('/');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setResetLoading(false);
    if (error) {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '메일 발송 완료', description: '비밀번호 재설정 링크를 이메일로 보냈습니다.' });
      setShowReset(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* 로고 */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary">BeautyLens</span>
        </div>
        <p className="text-sm text-muted-foreground">내 피부에 맞는 성분 분석</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* 비밀번호 재설정 화면 */}
        {showReset ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">비밀번호 재설정</h2>
              <p className="text-xs text-muted-foreground mt-1">가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다.</p>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="이메일 주소"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  className="rounded-xl pl-10"
                />
              </div>
              <Button type="submit" disabled={resetLoading} className="w-full rounded-xl">
                {resetLoading ? '발송 중...' : '재설정 링크 보내기'}
              </Button>
            </form>
            <button
              onClick={() => setShowReset(false)}
              className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
            >
              ← 로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            {/* 구글 로그인 — 메인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3.5 px-5 shadow-sm text-sm font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-60"
            >
              {googleLoading ? (
                <svg className="h-5 w-5 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 100 24v-4l-3 3 3 3v4A12 12 0 014 12z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {googleLoading ? '연결 중...' : 'Google로 계속하기'}
            </button>

            {/* 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">또는</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* 이메일 로그인 */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>이메일로 {isLogin ? '로그인' : '가입'}하기</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showEmail ? 'rotate-180' : ''}`} />
              </button>

              {showEmail && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="rounded-xl pl-10"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="rounded-xl pl-10"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl"
                    >
                      {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                    </button>
                    {isLogin && (
                      <button
                        onClick={() => { setShowReset(true); setResetEmail(email); }}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        비밀번호 찾기
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-muted-foreground leading-relaxed px-2">
          가입 시{' '}
          <a href="/terms" className="underline hover:text-primary">서비스 이용약관</a>
          {' '}및{' '}
          <a href="/privacy" className="underline hover:text-primary">개인정보 처리방침</a>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

export default Auth;
