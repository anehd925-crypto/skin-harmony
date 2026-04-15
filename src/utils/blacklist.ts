/**
 * 분석 완료 직후 호출 — 위험/주의 성분을 skin_blacklist 테이블에 자동 기록
 * Promise.all로 병렬 처리하여 N+1 쿼리 문제 해결
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

  // 기존 블랙리스트 일괄 조회 (1회 쿼리)
  const names = targets.map(i => i.name);
  const { data: existing } = await supabase
    .from('skin_blacklist' as never)
    .select('id, ingredient_name, danger_count, caution_count')
    .eq('user_id', userId)
    .in('ingredient_name', names);

  const existingMap = new Map(
    ((existing as Array<{ id: string; ingredient_name: string; danger_count: number; caution_count: number }>) ?? [])
      .map(e => [e.ingredient_name, e])
  );

  // 업데이트/삽입을 분리하여 병렬 처리
  const updates: Promise<unknown>[] = [];
  const inserts: Array<Record<string, unknown>> = [];

  for (const ing of targets) {
    const isDanger = ing.safety === 'danger';
    const current = existingMap.get(ing.name);

    if (current) {
      updates.push(
        supabase
          .from('skin_blacklist' as never)
          .update({
            danger_count: isDanger ? current.danger_count + 1 : current.danger_count,
            caution_count: !isDanger ? current.caution_count + 1 : current.caution_count,
            last_seen_at: new Date().toISOString(),
          } as never)
          .eq('id', current.id)
      );
    } else {
      inserts.push({
        user_id: userId,
        ingredient_name: ing.name,
        ingredient_name_en: ing.name_en ?? null,
        danger_count: isDanger ? 1 : 0,
        caution_count: !isDanger ? 1 : 0,
      });
    }
  }

  // 병렬 실행 (업데이트들 + 일괄 삽입 1건)
  await Promise.all([
    ...updates,
    inserts.length > 0
      ? supabase.from('skin_blacklist' as never).insert(inserts as never)
      : Promise.resolve(),
  ]);
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
