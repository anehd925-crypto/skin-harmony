import { corsHeaders } from '@supabase/supabase-js/cors'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_URL = 'https://ai-gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ingredientsText, productName, productBrand } = await req.json();

    if (!ingredientsText || ingredientsText.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: '전성분 텍스트를 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a cosmetics ingredient safety analyst. Analyze the given ingredient list and return a JSON response.

For each ingredient, provide:
- name: the ingredient name as written (Korean)
- name_en: English/INCI name if identifiable
- safety: one of "safe", "caution", or "danger"
  - "safe": Generally recognized as safe, commonly used
  - "caution": May cause irritation for sensitive skin, or has some concerns
  - "danger": Known irritants, allergens, or controversial ingredients (e.g., parabens, formaldehyde releasers, certain fragrances)
- description: Brief Korean explanation of what this ingredient does and any safety notes (1-2 sentences)

Also provide an overall summary:
- overallGrade: "good", "moderate", or "bad"
- summary: A brief Korean summary of the product's ingredient safety

Return ONLY valid JSON in this exact format:
{
  "productName": "string",
  "productBrand": "string",
  "ingredients": [
    { "name": "string", "name_en": "string", "safety": "safe|caution|danger", "description": "string" }
  ],
  "overallGrade": "good|moderate|bad",
  "summary": "string"
}`;

    const userPrompt = `제품명: ${productName || '알 수 없음'}
브랜드: ${productBrand || '알 수 없음'}

전성분 목록:
${ingredientsText}`;

    const aiResponse = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'AI 응답을 받지 못했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(content);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '분석 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
