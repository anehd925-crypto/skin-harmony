import { useNavigate } from 'react-router-dom';
import { Star, FlaskConical } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand: string;
    rating: number | null;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();

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
        <div className="mt-1 flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-current text-warning" />
          <span className="text-xs text-warning">{product.rating ?? '-'}</span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
