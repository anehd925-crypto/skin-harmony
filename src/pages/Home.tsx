import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { mockProducts } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Home = () => {
  const { profile } = useUser();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return mockProducts.filter(p =>
      p.name.includes(query) || p.brand.includes(query)
    );
  }, [query]);

  const recommended = mockProducts.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-5 pb-8 pt-12">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
          <span className="text-lg font-bold text-primary-foreground">BeautyLens</span>
        </div>
        <p className="mt-3 text-sm text-primary-foreground/80">
          안녕하세요! <span className="font-semibold text-primary-foreground">{profile.skinType}</span> 피부를 위한 맞춤 분석
        </p>

        {/* Profile Summary */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.skinConcerns.map(c => (
            <span key={c} className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {c}
            </span>
          ))}
          {profile.personalColor && profile.personalColor !== '모름' && (
            <span className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {profile.personalColor}
            </span>
          )}
        </div>
      </div>

      <div className="px-5">
        {/* Search */}
        <div className="relative -mt-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제품명 또는 브랜드 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="rounded-xl border-border bg-card pl-10 shadow-sm"
          />
        </div>

        {/* Search Results */}
        {query.trim() && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">검색 결과</h3>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다</p>
            ) : (
              filtered.map(p => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        )}

        {/* Recommendations */}
        {!query.trim() && (
          <div className="mt-6 space-y-3">
            <h3 className="text-base font-bold text-foreground">🌸 추천 제품</h3>
            {recommended.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
