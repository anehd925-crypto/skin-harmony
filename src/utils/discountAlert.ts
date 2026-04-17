import { supabase } from '@/integrations/supabase/client';

/**
 * 제품(name + brand)을 기준으로 할인 알림을 등록한다.
 *
 * 동작:
 * 1) products 테이블에서 동일 (name, brand) row를 검색
 * 2) 없으면 INSERT (RLS: 인증 사용자 허용 - 20260418000006 마이그레이션)
 * 3) wish_list에 INSERT → 트리거로 discount_alerts 자동 활성화
 *
 * 반환: { ok, productId, reason }
 */
export interface RegisterAlertResult {
  ok: boolean;
  productId?: string;
  /** 사용자에게 안내할 사유 (실패/이미 등록 등) */
  reason?: 'unauthenticated' | 'already_registered' | 'product_insert_failed' | 'wish_insert_failed' | 'unknown';
  message?: string;
}

export interface RegisterAlertInput {
  userId: string;
  name: string;
  brand: string;
  category?: 'skincare' | 'suncare' | 'makeup';
  productUrl?: string | null;
}

const norm = (s: string) => s.trim();

export async function registerDiscountAlert(input: RegisterAlertInput): Promise<RegisterAlertResult> {
  const { userId } = input;
  const name = norm(input.name);
  const brand = norm(input.brand);
  if (!userId) return { ok: false, reason: 'unauthenticated', message: '로그인이 필요합니다.' };
  if (!name || !brand) return { ok: false, reason: 'unknown', message: '제품명 또는 브랜드 정보가 부족합니다.' };

  // 1) 기존 product 검색 (case/공백 차이 무시)
  let productId: string | undefined;
  {
    const { data } = await supabase
      .from('products')
      .select('id')
      .ilike('name', name)
      .ilike('brand', brand)
      .limit(1)
      .maybeSingle();
    if (data?.id) productId = data.id as string;
  }

  // 2) 없으면 INSERT
  if (!productId) {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        name,
        brand,
        category: input.category ?? 'skincare',
        ...(input.productUrl ? { product_url: input.productUrl } : {}),
      })
      .select('id')
      .single();
    if (error || !inserted) {
      return {
        ok: false,
        reason: 'product_insert_failed',
        message: error?.message ?? '제품 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }
    productId = inserted.id as string;
  }

  // 3) 이미 찜되어 있는지 확인
  {
    const { data } = await supabase
      .from('wish_list')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (data?.id) {
      return { ok: true, productId, reason: 'already_registered', message: '이미 알림이 등록되어 있어요.' };
    }
  }

  // 4) wish_list insert → 트리거가 discount_alerts 활성화
  const { error: wishErr } = await supabase
    .from('wish_list')
    .insert({ user_id: userId, product_id: productId });
  if (wishErr) {
    return { ok: false, reason: 'wish_insert_failed', message: wishErr.message };
  }
  return { ok: true, productId };
}
