const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productA, productB, userProfile } = await req.json();

    if (!productA || !productB) {
      return new Response(
        JSON.stringify({ error: '비교할 제품 두 가지를 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const profileSummary = userProfile
      ? `피부타입: ${userProfile.skinType ?? '미설정'}, 피부고민: ${(userProfile.skinConcerns ?? []).join(', ') || '없음'}, 민감도: ${userProfile.skinSensitivity ?? '보통'}, 나이대: ${userProfile.ageGroup ?? '미설정'}, 피하는성분: ${(userProfile.avoidIngredients ?? []).join(', ') || '없음'}`
      : '프로필 정보 없음';

    const prompt = `당신은 한국 피부과학 전문가이자 화장품 성분 분석가입니다.

사용자 프로필: ${profileSummary}

비교 제품:
- 제품 A: ${productA.name}${productA.brand ? ` (${productA.brand})` : ''}
- 제품 B: ${productB.name}${productB.brand ? ` (${productB.brand})` : ''}

위 두 제품을 비교하여 이 사용자에게 어느 제품이 더 적합한지 분석해주세요.

다음 JSON을 정확히 반환하세요:
{
  "winner": "A" 또는 "B" 또는 "tie",
  "winnerReason": "추천 이유 2-3문장 (한국어)",
  "productA": {
    "name": "제품A 이름",
    "brand": "브랜드A",
    "mainIngredients": ["주요성분1", "주요성분2", "주요성분3"],
    "pros": ["장점1", "장점2", "장점3"],
    "cons": ["단점1", "단점2"],
    "suitableFor": "이런 피부에 적합 (한 문장)",
    "score": 75
  },
  "productB": {
    "name": "제품B 이름",
    "brand": "브랜드B",
    "mainIngredients": ["주요성분1", "주요성분2", "주요성분3"],
    "pros": ["장점1", "장점2", "장점3"],
    "cons": ["단점1", "단점2"],
    "suitableFor": "이런 피부에 적합 (한 문장)",
    "score": 68
  },
  "comparisonPoints": [
    { "aspect": "보습력", "a": "설명", "b": "설명", "winner": "A" 또는 "B" 또는 "tie" },
    { "aspect": "자극도", "a": "설명", "b": "설명", "winner": "A" 또는 "B" 또는 "tie" },
    { "aspect": "가성비", "a": "설명", "b": "설명", "winner": "A" 또는 "B" 또는 "tie" }
  ],
  "caution": "주의사항 (있으면 한 문장, 없으면 빈 문자열)"
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '당신은 한국 화장품 전문가입니다. JSON만 반환합니다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';

    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('compare-products error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
