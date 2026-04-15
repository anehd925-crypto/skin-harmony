import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import {
  Users, Heart, MessageCircle, Plus, X, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle, FlaskConical, Send, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  product_name: string;
  product_brand: string;
  overall_grade: 'good' | 'moderate' | 'bad' | 'none';
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles?: { nickname: string | null } | null;
}

interface PostComment {
  id: string;
  user_id: string;
  post_id: string;
  comment: string;
  created_at: string;
  profiles?: { nickname: string | null } | null;
}

const GRADE_META = {
  good:     { label: '안전', color: 'text-success', bg: 'bg-success/10', icon: <ShieldCheck className="h-3.5 w-3.5 text-success" /> },
  moderate: { label: '보통', color: 'text-warning', bg: 'bg-warning/10', icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" /> },
  bad:      { label: '주의', color: 'text-danger',  bg: 'bg-danger/10',  icon: <AlertTriangle className="h-3.5 w-3.5 text-danger" /> },
  none:     { label: '',     color: '',              bg: '',               icon: null },
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
};

const NicknameDisplay = ({ nickname, userId }: { nickname: string | null | undefined; userId: string }) => {
  const display = nickname?.trim() || `사용자${userId.slice(0, 6)}`;
  return <span className="font-semibold text-foreground">{display}</span>;
};

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWrite, setShowWrite] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newGrade, setNewGrade] = useState<'good' | 'moderate' | 'bad' | 'none'>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // 분석 결과에서 공유 시 URL 파라미터로 pre-fill
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const title = params.get('title');
    const body = params.get('body');
    const productName = params.get('product_name');
    const grade = params.get('overall_grade') as 'good' | 'moderate' | 'bad' | 'none' | null;
    if (title || body || productName) {
      setShowWrite(true);
      if (title) setNewTitle(title);
      if (body) setNewBody(body);
      if (productName) setNewProductName(productName);
      if (grade && ['good', 'moderate', 'bad', 'none'].includes(grade)) setNewGrade(grade);
    }
  }, [location.search]);

  // 게시물 목록
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community_posts', sortBy],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('id, user_id, title, body, product_name, product_brand, overall_grade, like_count, comment_count, created_at, profiles(nickname)')
        .eq('is_public', true)
        .order(sortBy === 'popular' ? 'like_count' : 'created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as CommunityPost[];
    },
  });

  // 내가 좋아요 한 게시물 목록
  const { data: myLikes = [] } = useQuery({
    queryKey: ['my_post_likes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      return (data ?? []).map(l => l.post_id);
    },
    enabled: !!user,
  });

  // 댓글 (펼쳐진 게시물)
  const { data: comments = [] } = useQuery({
    queryKey: ['post_comments', expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data } = await supabase
        .from('post_comments')
        .select('id, user_id, post_id, comment, created_at, profiles(nickname)')
        .eq('post_id', expandedId)
        .order('created_at', { ascending: true });
      return (data ?? []) as PostComment[];
    },
    enabled: !!expandedId,
  });

  // 게시물 작성
  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.');
      if (!newTitle.trim() || !newBody.trim()) throw new Error('제목과 내용을 입력해주세요.');
      await supabase.from('community_posts').insert({
        user_id: user.id,
        title: newTitle.trim(),
        body: newBody.trim(),
        product_name: newProductName.trim(),
        overall_grade: newGrade,
        is_public: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      setShowWrite(false);
      setNewTitle('');
      setNewBody('');
      setNewProductName('');
      setNewGrade('none');
      toast({ title: '게시물이 등록됐습니다.' });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  // 좋아요 토글
  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      const alreadyLiked = myLikes.includes(postId);
      if (alreadyLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      queryClient.invalidateQueries({ queryKey: ['my_post_likes', user?.id] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  // 댓글 작성
  const addComment = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('로그인이 필요합니다.');
      if (!commentText.trim()) return;
      await supabase.from('post_comments').insert({
        user_id: user.id,
        post_id: postId,
        comment: commentText.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post_comments', expandedId] });
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      setCommentText('');
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  // 내 게시물 삭제
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from('community_posts').delete().eq('id', postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community_posts'] });
      toast({ title: '게시물을 삭제했습니다.' });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <div className="gradient-primary px-5 pb-5 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">커뮤니티</h1>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setShowWrite(v => !v)}
              className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              {showWrite ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showWrite ? '닫기' : '글쓰기'}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-primary-foreground/80">제품 분석 경험을 나눠보세요</p>

        {/* 정렬 */}
        <div className="mt-3 flex gap-2">
          {(['latest', 'popular'] as const).map(s => (
            <button key={s} type="button" onClick={() => setSortBy(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sortBy === s ? 'bg-primary-foreground text-primary' : 'bg-primary-foreground/20 text-primary-foreground'
              }`}>
              {s === 'latest' ? '최신순' : '인기순'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 pt-3">
        {/* 글쓰기 폼 */}
        {showWrite && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <p className="text-sm font-bold text-foreground">새 게시물 작성</p>
            <Input
              placeholder="제목"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="rounded-lg text-sm"
            />
            <Input
              placeholder="제품명 (선택)"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
              className="rounded-lg text-sm"
            />
            {/* 등급 선택 */}
            <div className="flex gap-2">
              {(['none', 'good', 'moderate', 'bad'] as const).map(g => (
                <button key={g} type="button" onClick={() => setNewGrade(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    newGrade === g
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-muted-foreground'
                  }`}>
                  {g === 'none' ? '등급없음' : g === 'good' ? '안전' : g === 'moderate' ? '보통' : '주의'}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="분석 경험이나 제품 사용 후기를 자유롭게 공유해주세요..."
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              className="min-h-[100px] rounded-lg text-sm"
            />
            <Button
              onClick={() => createPost.mutate()}
              disabled={createPost.isPending || !newTitle.trim() || !newBody.trim()}
              className="w-full rounded-xl"
            >
              {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              게시하기
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">아직 게시물이 없어요</p>
            <p className="mt-1 text-xs text-muted-foreground">첫 번째로 경험을 공유해보세요!</p>
          </div>
        )}

        {posts.map(post => {
          const grade = GRADE_META[post.overall_grade] ?? GRADE_META.none;
          const isExpanded = expandedId === post.id;
          const isLiked = myLikes.includes(post.id);
          const isOwn = user?.id === post.user_id;

          return (
            <div key={post.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {/* 카드 헤더 */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {post.overall_grade !== 'none' && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${grade.bg} ${grade.color}`}>
                          {grade.icon}{grade.label}
                        </span>
                      )}
                      {post.product_name && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {post.product_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground leading-tight">{post.title}</p>
                  </div>
                  {isOwn && (
                    <button type="button" onClick={() => deletePost.mutate(post.id)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-danger">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.body}</p>

                {/* 작성자 + 시간 */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <NicknameDisplay nickname={post.profiles?.nickname} userId={post.user_id} />
                  <span>·</span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
              </div>

              {/* 액션 바 */}
              <div className="flex items-center border-t border-border px-4 py-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { toast({ title: '로그인이 필요합니다.' }); return; }
                    toggleLike.mutate(post.id);
                  }}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    isLiked ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {post.like_count}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(v => v === post.id ? null : post.id);
                    setCommentText('');
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comment_count}
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {post.product_name && (
                  <button
                    type="button"
                    onClick={() => navigate(`/explore?q=${encodeURIComponent(post.product_name)}`)}
                    className="ml-auto flex items-center gap-1 text-xs text-primary"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    제품 보기
                  </button>
                )}
              </div>

              {/* 댓글 영역 */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                  {/* 댓글 목록 */}
                  {comments.length > 0 ? (
                    <div className="space-y-2.5">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                            {(c.profiles?.nickname?.trim() || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <NicknameDisplay nickname={c.profiles?.nickname} userId={c.user_id} />
                              <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{c.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">첫 댓글을 남겨보세요</p>
                  )}

                  {/* 댓글 입력 */}
                  {user ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="댓글 입력..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment.mutate(post.id); } }}
                        className="rounded-xl text-sm h-9"
                      />
                      <button
                        type="button"
                        onClick={() => addComment.mutate(post.id)}
                        disabled={!commentText.trim() || addComment.isPending}
                        className="shrink-0 rounded-xl bg-primary px-3 py-2 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4 text-primary-foreground" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      댓글을 남기려면{' '}
                      <button type="button" onClick={() => navigate('/auth')} className="text-primary underline">로그인</button>
                      {' '}해주세요
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Community;
