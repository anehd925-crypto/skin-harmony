const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

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
    const { query } = await req.json();

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
        model: MODEL,
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
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [];
    }

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
