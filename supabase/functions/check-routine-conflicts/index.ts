/**
 * check-routine-conflicts Edge Function (v2)
 *
 * 루틴 제품들의 성분 조합을 AI로 분석하여
 * 충돌/주의/시너지 + 궁합 점수(0-100) + 대안 제품 추천을 반환합니다.
 *
 * Request body:
 * {
 *   products: Array<{ name: string; brand?: string; ingredients: string }>
 *   userProfile?: { skinType?: string; skinConcerns?: string[]; specialCondition?: string }
 * }
 *
 * Response additions (v2):
 *   compatibilityScore: number (0-100)
 *   scoreLabel: '완벽' | '좋음' | '보통' | '주의' | '위험'
 *   productRecommendations?: Array<{
 *     productType: string
 *     reason: string
 *     suggestedIngredients: string[]
 *     avoidIngredients: string[]
 *   }>
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { products, userProfile } = await req.json() as {
      products: Array<{ name: string; brand?: string; ingredients: string }>;
      userProfile?: { skinType?: string; skinConcerns?: string[]; specialCondition?: string };
    };

    if (!products || products.length < 2) {
      return new Response(
        JSON.stringify({ error: '궁합 분석을 위해 최소 2개 이상의 제품이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const productList = products
      .map((p, i) => `[제품 ${i + 1}] ${p.name}${p.brand ? ` (${p.brand})` : ''}\n성분: ${p.ingredients.slice(0, 300)}`)
      .join('\n\n');

    const profileText = userProfile
      ? `\n사용자 피부 프로필:\n- 피부타입: ${userProfile.skinType || '미설정'}\n- 피부 고민: ${(userProfile.skinConcerns || []).join(', ') || '없음'}\n- 특수조건: ${userProfile.specialCondition || 'none'}`
      : '';

    const systemPrompt = `You are a Korean cosmetics formulation expert and skincare routine specialist. Analyze ingredient interactions between multiple skincare products used together and provide a compatibility SCORE. Return valid JSON only, no markdown.

SCORING RULES:
- Start at 100 points
- Each HIGH severity conflict: -25 points
- Each MEDIUM conflict: -15 points
- Each LOW conflict: -8 points
- Each caution: -5 points
- Each synergy: +3 points (bonus, but final max is 100)
- Minimum: 0

Score labels:
- 90-100: "완벽"
- 70-89: "좋음"
- 50-69: "보통"
- 30-49: "주의"
- 0-29: "위험"

Return this EXACT JSON structure:
{
  "compatibilityScore": 85,
  "scoreLabel": "좋음",
  "conflicts": [
    {
      "product_a": "제품명",
      "product_b": "제품명",
      "ingredient_a": "성분A",
      "ingredient_b": "성분B",
      "severity": "high|medium|low",
      "reason": "한국어 설명 2-3문장",
      "recommendation": "한국어 권장사항"
    }
  ],
  "cautions": [
    {
      "product_a": "제품명",
      "product_b": "제품명",
      "ingredient_a": "성분A",
      "ingredient_b": "성분B",
      "reason": "한국어 설명",
      "recommendation": "한국어 권장사항"
    }
  ],
  "synergies": [
    {
      "product_a": "제품명",
      "product_b": "제품명",
      "ingredient_a": "성분A",
      "ingredient_b": "성분B",
      "benefit": "한국어 시너지 효과 설명"
    }
  ],
  "overallSafety": "safe|caution|warning",
  "summary": "전체 루틴 안전성 총평 (한국어 3-4문장)",
  "applicationOrder": ["제품명1 → 이유", "제품명2 → 이유"],
  "productRecommendations": [
    {
      "productType": "대체 제품 유형 (예: 저자극 AHA 토너)",
      "reason": "이 제품을 추천하는 이유 (현재 충돌 해결 관점)",
      "suggestedIngredients": ["추천 성분1", "추천 성분2"],
      "avoidIngredients": ["피해야 할 성분1"],
      "targetConflict": "어떤 충돌을 해결하는지"
    }
  ]
}

IMPORTANT:
- productRecommendations: ONLY include when compatibilityScore < 70. If score >= 70, set to empty array [].
- Recommend 2-4 product TYPES that would improve the routine, not brand-specific products.
- Focus on replacing conflicting products with gentler alternatives.
- applicationOrder must include ALL products, ordered from thinnest to thickest texture.

Key conflict rules:
- AHA/BHA + Retinol: HIGH severity (pH incompatibility + irritation risk)
- Benzoyl Peroxide + Retinol: HIGH severity (deactivation)
- Multiple strong actives (retinol + AHA + BHA together): HIGH warning
- Vitamin C (L-ascorbic acid) + Niacinamide: LOW caution in some formulations
- Alcohol + Hyaluronic Acid: LOW caution (may reduce HA efficacy)
- Synergy: Niacinamide + Zinc, Vitamin C + Vitamin E, HA + Ceramide`;

    const userPrompt = `다음 루틴 제품들의 궁합을 분석해주세요:${profileText}\n\n${productList}\n\n위 제품들의 궁합 점수를 계산하고 상세 분석을 제공해주세요. JSON만 반환하세요.`;

    const aiResp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('Groq error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'AI 응답을 받지 못했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: '응답 파싱 실패' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      result = JSON.parse(match[0]);
    }

    // 점수 필드 보정 (AI가 누락할 경우 계산)
    if (typeof result.compatibilityScore !== 'number') {
      const conflicts = (result.conflicts as Array<{ severity?: string }>) || [];
      const cautions = (result.cautions as unknown[]) || [];
      const synergies = (result.synergies as unknown[]) || [];
      let score = 100;
      for (const c of conflicts) {
        if (c.severity === 'high') score -= 25;
        else if (c.severity === 'medium') score -= 15;
        else score -= 8;
      }
      score -= cautions.length * 5;
      score += synergies.length * 3;
      score = Math.max(0, Math.min(100, score));
      result.compatibilityScore = score;
    }

    const score = result.compatibilityScore as number;
    if (!result.scoreLabel) {
      result.scoreLabel =
        score >= 90 ? '완벽' :
        score >= 70 ? '좋음' :
        score >= 50 ? '보통' :
        score >= 30 ? '주의' : '위험';
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('check-routine-conflicts error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
