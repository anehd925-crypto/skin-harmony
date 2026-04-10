import { useParams, useNavigate } from 'react-router-dom';
import { mockProducts } from '@/data/mockData';
import { useUser } from '@/contexts/UserContext';
import SafetyBadge from '@/components/SafetyBadge';
import BottomNav from '@/components/BottomNav';
import { ChevronLeft, Star, FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUser();
  const product = mockProducts.find(p => p.id === id);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">제품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const safeCount = product.ingredients.filter(i => i.safety === 'safe').length;
  const cautionCount = product.ingredients.filter(i => i.safety === 'caution').length;
  const dangerCount = product.ingredients.filter(i => i.safety === 'danger').length;
  const totalCount = product.ingredients.length;
  const safePercent = Math.round((safeCount / totalCount) * 100);

  // Check allergies
  const allergyMatches = product.ingredients.filter(i =>
    profile.allergies.some(a => i.nameKr.includes(a) || i.name.toLowerCase().includes(a.toLowerCase()))
  );

  const overallGrade = dangerCount === 0 && cautionCount <= 1 ? 'good' : dangerCount >= 2 ? 'bad' : 'moderate';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-5 pb-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/80">
          <ChevronLeft className="h-4 w-4" />
          뒤로
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
        {/* Overall Score */}
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

        {/* Allergy Warning */}
        {allergyMatches.length > 0 && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
            <p className="text-xs font-semibold text-danger">⚠️ 알레르기 성분 감지</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allergyMatches.map(i => i.nameKr).join(', ')}
            </p>
          </div>
        )}

        {/* Ingredient List */}
        <div className="mt-6">
          <h2 className="mb-3 text-base font-bold text-foreground">전성분 분석</h2>
          <div className="space-y-2">
            {product.ingredients.map((ingredient, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ingredient.nameKr}</p>
                    <p className="text-xs text-muted-foreground">{ingredient.name}</p>
                  </div>
                  <SafetyBadge safety={ingredient.safety} />
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
