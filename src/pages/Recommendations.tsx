import { useState } from 'react';
import { mockProducts } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

const categories = [
  { key: 'all', label: '전체' },
  { key: 'skincare', label: '스킨케어' },
  { key: 'suncare', label: '선케어' },
  { key: 'makeup', label: '색조' },
] as const;

const Recommendations = () => {
  const [tab, setTab] = useState<string>('all');

  const filtered = tab === 'all' ? mockProducts : mockProducts.filter(p => p.category === tab);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12">
        <h1 className="text-xl font-bold text-foreground">추천 제품</h1>
        <p className="mt-1 text-sm text-muted-foreground">내 피부에 맞는 제품을 찾아보세요</p>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto px-5">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setTab(cat.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              tab === cat.key
                ? 'gradient-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 px-5">
        {filtered.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Recommendations;
