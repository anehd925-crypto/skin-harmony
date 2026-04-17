const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

interface ProductSuggestion {
  name: string;
  brand: string;
  category: string;
  step: string;
  is_morning: boolean;
  is_evening: boolean;
  note: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── 성분 사전 모드: 성분 상세 정보 조회 ──────────────────────────────────────
    if (body.ingredientLookup) {
      const { query } = body;
      const ingredientPrompt = `당신은 화장품 성분 전문가입니다.

"${query}" 성분에 대해 다음 JSON을 정확히 반환하세요:
{
  "name": "한글 성분명",
  "nameEn": "영문 성분명 (INCI name)",
  "category": "보습제 | 유화제 | 계면활성제 | 방부제 | 항산화제 | 자외선차단제 | 미백제 | 각질제거제 | 향료 | 색소 | 기타",
  "description": "성분 설명 2-3문장 (쉬운 한국어)",
  "benefits": ["효능1", "효능2", "효능3"],
  "risks": ["주의사항1", "주의사항2"],
  "ewgGrade": "1~10 사이 숫자 (EWG 등급 추정)",
  "suitableFor": "추천 피부 타입 한 줄",
  "avoidFor": "주의 피부 타입 한 줄 (없으면 빈 문자열)",
  "similar": [
    { "name": "유사 성분명", "reason": "왜 비슷한지 한 줄" }
  ]
}
규칙:
- similar: 동일한 기능/역할을 하는 대체 성분 3~4개.
  예: 히알루론산 → 나트륨히알루로네이트, 글리세린, 베타인.
- 한국 화장품에서 흔하게 쓰이는 성분 위주로.
JSON만 반환하세요.`;

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            { role: 'system', content: '화장품 성분 전문가입니다. JSON만 반환합니다.' },
            { role: 'user', content: ingredientPrompt },
          ],
          temperature: 0.2,
          max_tokens: 900,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error(`Groq error: ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '{}';
      let ingredient = {};
      try { ingredient = JSON.parse(content); } catch { /* fallback */ }

      return new Response(
        JSON.stringify({ ingredient }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 피부 타입 진단 모드 ─────────────────────────────────────────────────
    if (body.skinDiagnosis) {
      const { query } = body;
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            {
              role: 'system',
              content: '당신은 한국 피부과/코스메틱 컨설턴트입니다. 사용자 설문만 근거로 피부 타입을 진단하고, 반드시 요청한 JSON 스키마로만 답변합니다.',
            },
            { role: 'user', content: query },
          ],
          temperature: 0.2,
          max_tokens: 700,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq skin diagnosis error:', errText);
        return new Response(
          JSON.stringify({ error: 'diagnosis_error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '{}';
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(content); } catch { parsed = {}; }

      return new Response(
        JSON.stringify(parsed),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Vision 모드: 이미지로 제품 인식 ──────────────────────────────────────
    if (body.imageBase64) {
      const { imageBase64 } = body;

      const visionPrompt = `이 이미지는 화장품 제품 사진입니다.
이미지에서 제품 정보를 정확히 읽어내세요.

다음 JSON을 반환하세요 (인식 불가 항목은 빈 문자열):
{
  "name": "제품명 (브랜드 제외)",
  "brand": "브랜드명",
  "category": "cleansing_foam | cleansing_oil | cleansing_water | skincare | suncare | treatment | makeup | body | hair",
  "step": "클렌징 | 토너·스킨 | 에센스 | 세럼·앰플 | 아이크림 | 로션·에멀전 | 크림 | 선크림 | 메이크업",
  "is_morning": true or false,
  "is_evening": true or false,
  "note": "제품 특징 한 줄 (20자 이내)",
  "confidence": "high | medium | low"
}

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64.startsWith('data:')
                      ? imageBase64
                      : `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
                { type: 'text', text: visionPrompt },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq vision error:', errText);
        return new Response(
          JSON.stringify({ product: null, error: 'vision_error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '{}';

      let product: ProductSuggestion & { confidence?: string } = {
        name: '', brand: '', category: 'skincare', step: '토너·스킨',
        is_morning: true, is_evening: true, note: '', confidence: 'low',
      };
      try {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) product = { ...product, ...JSON.parse(match[0]) };
      } catch { /* 파싱 실패 시 기본값 */ }

      return new Response(
        JSON.stringify({ product }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 텍스트 검색 모드 ──────────────────────────────────────────────────────
    const { query } = body;

    if (!query || query.trim().length < 1) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = `당신은 한국 화장품 전문가입니다.
사용자가 "${query}"를 검색했을 때, 이 검색어와 관련된 실제 한국 화장품 제품을 최대 6개까지 제안해주세요.

정확한 제품명을 모를 경우, 검색어와 가장 유사한 제품명을 추측하여 제안해도 됩니다.
실제로 존재하는 제품을 중심으로, 브랜드명+제품명 형식으로 제안해주세요.

각 제품에 대해 다음 JSON 배열을 반환하세요:
[
  {
    "name": "정확한 제품명 (브랜드명 제외)",
    "brand": "브랜드명",
    "category": "cleansing_foam | cleansing_oil | cleansing_water | skincare | suncare | treatment | makeup | body | hair 중 하나",
    "step": "클렌징 | 토너·스킨 | 에센스 | 세럼·앰플 | 아이크림 | 로션·에멀전 | 크림 | 선크림 | 메이크업 중 하나",
    "is_morning": true 또는 false,
    "is_evening": true 또는 false,
    "note": "제품 특징 한 줄 (20자 이내)"
  }
]

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: '당신은 한국 화장품 전문가입니다. JSON만 반환합니다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '[]';

    let suggestions: ProductSuggestion[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
    } catch { suggestions = []; }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('product-search error:', err);
    return new Response(
      JSON.stringify({ suggestions: [], error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
