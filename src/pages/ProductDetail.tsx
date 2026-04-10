import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import SafetyBadge from '@/components/SafetyBadge';
import BottomNav from '@/components/BottomNav';
import { ChevronLeft, Star, FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUser();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients', id],
    queryFn: async () => {
      const { data } = await supabase.from('ingredients').select('*').eq('product_id', id!).order('sort_order');
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">제품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const safeCount = ingredients.filter(i => i.safety === 'safe').length;
  const cautionCount = ingredients.filter(i => i.safety === 'caution').length;
  const dangerCount = ingredients.filter(i => i.safety === 'danger').length;

  const allergyMatches = ingredients.filter(i =>
    profile.allergies.some(a => i.name_kr.includes(a) || i.name.toLowerCase().includes(a.toLowerCase()))
  );

  const overallGrade = dangerCount === 0 && cautionCount <= 1 ? 'good' : dangerCount >= 2 ? 'bad' : 'moderate';

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary px-5 pb-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/80">
          <ChevronLeft className="h-4 w-4" />뒤로
        </button>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-foreground/20">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">{product.name}</h1>
            <p className="text-sm text-primary-foreground/70">{product.brand}</p>
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current text-primary-foreground" />
              <span className="text-sm text-primary-foreground">{product.rating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5">
        <div className={`-mt-4 rounded-xl border p-4 shadow-sm ${
          overallGrade === 'good' ? 'border-success/30 bg-success/5' :
          overallGrade === 'bad' ? 'border-danger/30 bg-danger/5' :
          'border-warning/30 bg-warning/5'
        }`}>
          <div className="flex items-center gap-2">
            {overallGrade === 'good' ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${overallGrade === 'bad' ? 'text-danger' : 'text-warning'}`} />
            )}
            <span className="text-sm font-bold text-foreground">
              {overallGrade === 'good' ? '내 피부에 좋은 제품이에요!' :
               overallGrade === 'bad' ? '주의가 필요한 제품이에요' :
               '일부 성분에 주의가 필요해요'}
            </span>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="text-success font-medium">안전 {safeCount}</span>
            <span className="text-warning font-medium">주의 {cautionCount}</span>
            <span className="text-danger font-medium">위험 {dangerCount}</span>
          </div>
        </div>

        {allergyMatches.length > 0 && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
            <p className="text-xs font-semibold text-danger">⚠️ 알레르기 성분 감지</p>
            <p className="mt-1 text-xs text-muted-foreground">{allergyMatches.map(i => i.name_kr).join(', ')}</p>
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-3 text-base font-bold text-foreground">전성분 분석</h2>
          <div className="space-y-2">
            {ingredients.map(ingredient => (
              <div key={ingredient.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ingredient.name_kr}</p>
                    <p className="text-xs text-muted-foreground">{ingredient.name}</p>
                  </div>
                  <SafetyBadge safety={ingredient.safety as 'safe' | 'caution' | 'danger'} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ingredient.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
