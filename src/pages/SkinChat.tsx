import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import BottomNav from '@/components/BottomNav';
import { ChevronLeft, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { track, EVENT } from '@/lib/analytics';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const SUGGESTED_QUESTIONS = [
  '내 피부 타입에 맞는 토너 성분을 추천해줘',
  '요즘 건조한데 어떻게 관리할까?',
  '보관함 제품 조합이 괜찮은지 점검해줘',
  '피부 트러블이 반복되는데 원인이 뭘까?',
];

const SkinChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  useEffect(() => {
    void track(EVENT.CHAT_OPENED);
  }, []);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['skin_chat_messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('skin_chat_messages' as never)
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(60);
      return (data as ChatMessage[]) ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('로그인이 필요합니다');
      const trimmed = text.trim();
      if (!trimmed) throw new Error('메시지를 입력해주세요');

      const { error: insertErr } = await supabase
        .from('skin_chat_messages' as never)
        .insert({ user_id: user.id, role: 'user', content: trimmed } as never);
      if (insertErr) throw insertErr;

      void track(EVENT.CHAT_MESSAGE_SENT, { length: trimmed.length });

      await queryClient.invalidateQueries({ queryKey: ['skin_chat_messages', user.id] });

      const [{ data: analysisData }, { data: cabinetData }] = await Promise.all([
        supabase.from('analysis_history')
          .select('product_name, product_brand, overall_grade')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('my_cabinet' as never)
          .select('product_name, product_brand, category')
          .eq('user_id', user.id).limit(8),
      ]);

      const historyForLLM = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      const { data, error } = await supabase.functions.invoke('skin-chat', {
        body: {
          messages: historyForLLM,
          userProfile: {
            skinType: profile.skinType,
            skinConcerns: profile.skinConcerns,
            skinSensitivity: profile.skinSensitivity,
            ageGroup: profile.ageGroup,
            avoidIngredients: profile.avoidIngredients,
            skinGoals: profile.skinGoals,
          },
          recentAnalyses: analysisData ?? [],
          cabinetSummary: cabinetData ?? [],
        },
      });

      if (error || !data?.reply) {
        throw new Error(data?.error ?? error?.message ?? 'AI 응답을 받지 못했어요');
      }

      const reply: string = data.reply;

      const { error: assistantErr } = await supabase
        .from('skin_chat_messages' as never)
        .insert({ user_id: user.id, role: 'assistant', content: reply } as never);
      if (assistantErr) throw assistantErr;

      void track(EVENT.CHAT_REPLY_RECEIVED, { length: reply.length });
      return reply;
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['skin_chat_messages', user.id] });
    },
    onError: (err) => {
      toast({
        title: 'AI 응답 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('skin_chat_messages' as never)
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['skin_chat_messages', user.id] });
      toast({ title: '대화를 초기화했어요' });
    },
    onError: (err) => {
      toast({
        title: '대화 초기화 실패',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;
    const text = input;
    setInput('');
    sendMutation.mutate(text);
  };

  const handleSuggested = (q: string) => {
    if (sendMutation.isPending) return;
    sendMutation.mutate(q);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-border safe-top px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">AI 피부 비서</h1>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {profile.skinType ? `${profile.skinType} 피부에 맞춘 대화` : '피부 상담을 시작해보세요'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { if (confirm('대화 기록을 모두 삭제할까요?')) clearMutation.mutate(); }}
            disabled={clearMutation.isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 text-muted-foreground"
            title="대화 초기화"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-40">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4 mt-6">
            <div className="text-center space-y-2 py-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-base font-bold text-foreground">무엇이 궁금하세요?</p>
              <p className="text-xs text-muted-foreground">
                프로필·분석 이력·보관함을 바탕으로 맞춤 답변을 드려요
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground px-1">추천 질문</p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggested(q)}
                  disabled={sendMutation.isPending}
                  className="flex w-full items-start gap-2 rounded-xl border border-border bg-white p-3 text-left disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-white border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">답변 생성 중...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-md pb-24">
        <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="피부 고민을 물어보세요"
            disabled={sendMutation.isPending}
            className="flex-1 rounded-full border border-border bg-neutral-50 px-4 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            {sendMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SkinChat;
