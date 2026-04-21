/**
 * AddToCabinetSheet
 * - 분석 결과 등 외부 화면에서 호출하는 "1탭 보관함 추가" 시트
 * - 카테고리만 선택하면 카테고리 디폴트(step_order, 아침/저녁)가 자동 적용
 * - 동일 제품(이름+브랜드)이 이미 있으면 등록 버튼이 "이미 보관함에 있음"으로 변경
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { CABINET_CATEGORIES, getCategoryDef, type CategoryKey } from '@/constants/cabinetCategories';
import { Check, Loader2, Package, Sun, Moon, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 분석 결과 등에서 받은 제품 정보 */
  product: {
    name: string;
    brand?: string;
    imageUrl?: string | null;
    productUrl?: string | null;
    /** 분석 기록 id (있으면 my_cabinet.analysis_history_id에 연결) */
    analysisHistoryId?: string | null;
    /** 추정 카테고리(분석 결과 등에서 추정) — 디폴트 선택값 */
    suggestedCategory?: CategoryKey;
  } | null;
  onSaved?: () => void;
}

const AddToCabinetSheet = ({ open, onOpenChange, product, onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryKey>(product?.suggestedCategory ?? 'skincare');
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const categoryDef = useMemo(() => getCategoryDef(category), [category]);

  // 카테고리 바뀔 때 디폴트 아침/저녁 토글 자동 반영
  useEffect(() => {
    setMorning(categoryDef.defaultMorning);
    setEvening(categoryDef.defaultEvening);
  }, [categoryDef]);

  // 시트 열 때마다 상태 초기화 + 중복 체크
  useEffect(() => {
    if (!open || !product || !user) return;

    setCategory(product.suggestedCategory ?? 'skincare');
    setSavedId(null);
    setDuplicate(false);
    setDuplicateChecked(false);

    (async () => {
      const cleanName = product.name.trim().toLowerCase();
      const cleanBrand = (product.brand ?? '').trim().toLowerCase();
      const { data } = await supabase
        .from('my_cabinet' as never)
        .select('id, product_name, product_brand')
        .eq('user_id', user.id);
      const rows = ((data ?? []) as { id: string; product_name: string; product_brand: string | null }[]);
      const hit = rows.find(r =>
        r.product_name.trim().toLowerCase() === cleanName
        && (r.product_brand ?? '').trim().toLowerCase() === cleanBrand
      );
      if (hit) {
        setDuplicate(true);
        setSavedId(hit.id);
      }
      setDuplicateChecked(true);
    })();
  }, [open, product, user]);

  if (!product) return null;

  const handleSave = async () => {
    if (!user) {
      toast({ title: '로그인이 필요합니다', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (duplicate) {
      onOpenChange(false);
      return;
    }
    if (!morning && !evening) {
      toast({ title: '아침 또는 저녁 중 하나는 선택해주세요', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      product_name: product.name.trim(),
      product_brand: product.brand?.trim() || null,
      category,
      step_order: categoryDef.defaultStep,
      is_morning: morning,
      is_evening: evening,
      notes: null,
      image_url: product.imageUrl ?? null,
      product_url: product.productUrl ?? null,
      analysis_history_id: product.analysisHistoryId ?? null,
    };

    const { data, error } = await supabase
      .from('my_cabinet' as never)
      .insert(payload)
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      toast({
        title: '보관함 추가 실패',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setSavedId((data as { id: string } | null)?.id ?? null);
    setDuplicate(true);
    toast({
      title: '보관함에 추가했어요',
      description: `${product.name}${product.brand ? ` (${product.brand})` : ''}`,
    });
    onSaved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-600" />
            보관함에 추가
          </SheetTitle>
        </SheetHeader>

        {/* 제품 미리보기 */}
        <div className="mt-3 flex gap-3 rounded-2xl border border-border bg-neutral-50 p-3">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-14 w-14 shrink-0 rounded-xl object-cover bg-white border border-border"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-xl bg-white border border-border flex items-center justify-center text-xl">
              {categoryDef.emoji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
            {product.brand && <p className="text-xs text-muted-foreground truncate">{product.brand}</p>}
            {duplicateChecked && duplicate && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                <Check className="h-3 w-3" /> 이미 보관함에 있어요
              </p>
            )}
          </div>
        </div>

        {/* 카테고리 1탭 선택 */}
        <div className="mt-4">
          <p className="text-xs font-bold text-foreground mb-2">카테고리 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {CABINET_CATEGORIES.map(c => {
              const active = c.key === category;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  disabled={duplicate}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs transition-colors disabled:opacity-50 ${
                    active
                      ? 'border-violet-400 bg-violet-50 text-violet-700 font-bold'
                      : 'border-border bg-white text-muted-foreground hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-base leading-none">{c.emoji}</span>
                  <span className="leading-tight">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 사용 시간 (디폴트는 카테고리 기반) */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={duplicate}
            onClick={() => setMorning(m => !m)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              morning
                ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                : 'border-border bg-white text-muted-foreground'
            }`}
          >
            <Sun className="h-3.5 w-3.5" /> 아침 사용
            {morning && <Check className="h-3 w-3" />}
          </button>
          <button
            type="button"
            disabled={duplicate}
            onClick={() => setEvening(e => !e)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              evening
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-border bg-white text-muted-foreground'
            }`}
          >
            <Moon className="h-3.5 w-3.5" /> 저녁 사용
            {evening && <Check className="h-3 w-3" />}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          단계와 메모 등 세부 정보는 추가 후 보관함에서 언제든 수정할 수 있어요.
        </p>

        {/* 액션 */}
        <div className="mt-5 flex flex-col gap-2">
          {duplicate ? (
            <button
              type="button"
              onClick={() => { onOpenChange(false); navigate('/cabinet'); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white"
            >
              <ExternalLink className="h-4 w-4" /> 보관함에서 보기
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !duplicateChecked}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              보관함에 추가하기
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border bg-white py-2.5 text-xs font-semibold text-muted-foreground"
          >
            취소
          </button>
          {savedId && !duplicate && (
            <button
              type="button"
              onClick={() => { onOpenChange(false); navigate('/cabinet'); }}
              className="text-center text-[11px] font-semibold text-violet-600 underline underline-offset-2"
            >
              방금 추가한 제품을 보관함에서 확인하기
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddToCabinetSheet;
