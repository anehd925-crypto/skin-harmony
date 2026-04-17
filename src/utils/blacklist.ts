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
  const raw = ingredients.filter(i => i.safety === 'danger' || i.safety === 'caution');
  if (raw.length === 0) return;

  // 동일 응답 내 같은 성분이 중복 등장하는 경우를 ingredient_name 기준으로 통합한다.
  // (unique 제약 위반·중복 집계 방지)
  const mergedMap = new Map<string, { name: string; name_en?: string; danger: number; caution: number }>();
  for (const ing of raw) {
    const key = ing.name.trim();
    if (!key) continue;
    const prev = mergedMap.get(key) ?? { name: key, name_en: ing.name_en, danger: 0, caution: 0 };
    if (ing.safety === 'danger') prev.danger += 1;
    else prev.caution += 1;
    if (!prev.name_en && ing.name_en) prev.name_en = ing.name_en;
    mergedMap.set(key, prev);
  }
  const targets = Array.from(mergedMap.values());
  const names = targets.map(t => t.name);

  const { data: existing, error: fetchErr } = await supabase
    .from('skin_blacklist' as never)
    .select('id, ingredient_name, danger_count, caution_count')
    .eq('user_id', userId)
    .in('ingredient_name', names);

  if (fetchErr) {
    console.error('[blacklist] fetch existing failed:', fetchErr.message);
    return;
  }

  const existingMap = new Map(
    ((existing as Array<{ id: string; ingredient_name: string; danger_count: number; caution_count: number }>) ?? [])
      .map(e => [e.ingredient_name, e])
  );

  const updates: Array<Promise<{ error: unknown }>> = [];
  const inserts: Array<Record<string, unknown>> = [];

  for (const t of targets) {
    const current = existingMap.get(t.name);
    if (current) {
      updates.push(
        supabase
          .from('skin_blacklist' as never)
          .update({
            danger_count: current.danger_count + t.danger,
            caution_count: current.caution_count + t.caution,
            last_seen_at: new Date().toISOString(),
          } as never)
          .eq('id', current.id) as unknown as Promise<{ error: unknown }>
      );
    } else {
      inserts.push({
        user_id: userId,
        ingredient_name: t.name,
        ingredient_name_en: t.name_en ?? null,
        danger_count: t.danger,
        caution_count: t.caution,
      });
    }
  }

  const results = await Promise.all([
    ...updates,
    inserts.length > 0
      ? supabase.from('skin_blacklist' as never).insert(inserts as never)
      : Promise.resolve({ error: null }),
  ]);

  for (const r of results) {
    const err = (r as { error?: { message?: string } } | null)?.error;
    if (err) console.error('[blacklist] sync error:', err.message ?? err);
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
