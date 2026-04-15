/**
 * 분석 완료 직후 호출 — 위험/주의 성분을 skin_blacklist 테이블에 자동 기록
 */
import { supabase } from '@/integrations/supabase/client';

interface Ingredient {
  name: string;
  name_en?: string;
  safety: 'safe' | 'caution' | 'danger';
}

export async function syncBlacklist(userId: string, ingredients: Ingredient[]) {
  const targets = ingredients.filter(i => i.safety === 'danger' || i.safety === 'caution');
  if (targets.length === 0) return;

  for (const ing of targets) {
    const isDanger = ing.safety === 'danger';
    // upsert: 이미 있으면 카운트 증가, 없으면 신규 삽입
    const { data: existing } = await supabase
      .from('skin_blacklist' as never)
      .select('id, danger_count, caution_count')
      .eq('user_id', userId)
      .eq('ingredient_name', ing.name)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('skin_blacklist' as never)
        .update({
          danger_count: isDanger
            ? (existing as { danger_count: number }).danger_count + 1
            : (existing as { danger_count: number }).danger_count,
          caution_count: !isDanger
            ? (existing as { caution_count: number }).caution_count + 1
            : (existing as { caution_count: number }).caution_count,
          last_seen_at: new Date().toISOString(),
        } as never)
        .eq('id', (existing as { id: string }).id);
    } else {
      await supabase
        .from('skin_blacklist' as never)
        .insert({
          user_id: userId,
          ingredient_name: ing.name,
          ingredient_name_en: ing.name_en ?? null,
          danger_count: isDanger ? 1 : 0,
          caution_count: !isDanger ? 1 : 0,
        } as never);
    }
  }
}

/**
 * 분석 결과의 성분 목록 중 사용자 블랙리스트와 겹치는 항목을 반환
 */
export async function checkBlacklistHits(
  userId: string,
  ingredients: Ingredient[]
): Promise<string[]> {
  if (!userId || ingredients.length === 0) return [];

  const names = ingredients.map(i => i.name);
  const { data } = await supabase
    .from('skin_blacklist' as never)
    .select('ingredient_name')
    .eq('user_id', userId)
    .in('ingredient_name', names);

  return ((data as Array<{ ingredient_name: string }>) ?? []).map(d => d.ingredient_name);
}
