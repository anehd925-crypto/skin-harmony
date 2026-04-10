import { useNavigate } from 'react-router-dom';
import { Star, FlaskConical } from 'lucide-react';
import type { Product } from '@/data/mockData';

interface ProductCardProps {
  product: Product;
}

const categoryLabels = { skincare: '스킨케어', suncare: '선케어', makeup: '색조' };

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const safeCount = product.ingredients.filter(i => i.safety === 'safe').length;
  const totalCount = product.ingredients.length;
  const safePercent = Math.round((safeCount / totalCount) * 100);

  return (
    <button
      onClick={() => navigate(`/product/${product.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-accent">
        <FlaskConical className="h-7 w-7 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-xs text-warning">
            <Star className="h-3 w-3 fill-current" />
            {product.rating}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-success font-medium">안전 {safePercent}%</span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
