import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    } else if (!isLogin) {
      toast({ title: '가입 완료!', description: '이메일 인증 후 로그인해주세요.' });
      setIsLogin(true);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-soft px-6">
      <div className="mb-8 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold text-primary">BeautyLens</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-foreground">
          {isLogin ? '로그인' : '회원가입'}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {isLogin ? '계정에 로그인하세요' : '새 계정을 만드세요'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="비밀번호"
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
            className="w-full rounded-xl gradient-primary text-primary-foreground"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
          </Button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="mt-4 block w-full text-center text-sm text-muted-foreground hover:text-primary"
        >
          {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
