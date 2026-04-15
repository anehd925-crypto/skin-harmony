/**
 * diary-insights Edge Function
 *
 * 피부 일기 + 분석 기록을 AI로 분석하여
 * 피부 상태와 사용 제품의 상관관계를 도출합니다.
 *
 * Request body:
 * {
 *   diaryEntries: Array<{ date: string; skin_score: number; trouble_spots: string[]; notes: string }>
 *   recentAnalyses: Array<{ date: string; product_name: string; product_brand: string; overall_grade: string; key_ingredients: string[] }>
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface DiaryEntry {
  date: string;
  skin_score: number;
  trouble_spots: string[];
  notes: string;
}

interface AnalysisEntry {
  date: string;
  product_name: string;
  product_brand: string;
  overall_grade: string;
  key_ingredients: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      diaryEntries: DiaryEntry[];
      recentAnalyses: AnalysisEntry[];
      quickComment?: boolean;
      score?: number;
      troubles?: string[];
      skinType?: string;
    };

    // ── quickComment 모드: 오늘 기록 저장 직후 짧은 AI 코멘트 ──
    if (body.quickComment) {
      const { score = 3, troubles = [], skinType = '' } = body;
      const troubleText = troubles.length > 0 ? troubles.join(', ') : '특이사항 없음';
      const prompt = `당신은 친절한 한국 피부관리 전문가입니다.
사용자 피부타입: ${skinType}
오늘 피부점수: ${score}/5
오늘 트러블: ${troubleText}

이 정보를 바탕으로 오늘 피부 상태에 대한 짧은 코멘트(1~2문장, 50자 이내)와 간단한 케어 팁을 알려주세요.
따뜻하고 간결하게, 이모지 1개 포함해서 답변하세요. 텍스트만 반환하세요.`;

      const aiResp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 120,
        }),
      });
      if (aiResp.ok) {
        const data = await aiResp.json();
        const comment = data.choices?.[0]?.message?.content?.trim() ?? '';
        return new Response(
          JSON.stringify({ quickComment: comment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ quickComment: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { diaryEntries, recentAnalyses } = body;

    if (!diaryEntries || diaryEntries.length < 3) {
      return new Response(
        JSON.stringify({ error: '인사이트 분석을 위해 최소 3일 이상의 일기가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const diaryText = diaryEntries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d =>
        `[${d.date}] 피부점수: ${d.skin_score}/5, 트러블: ${d.trouble_spots.join(', ') || '없음'}, 메모: ${d.notes || '없음'}`
      )
      .join('\n');

    const analysisText = recentAnalyses.length > 0
      ? recentAnalyses
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(a =>
            `[${a.date}] ${a.product_name}${a.product_brand ? ` (${a.product_brand})` : ''} - 등급: ${a.overall_grade}, 주요성분: ${a.key_ingredients.slice(0, 5).join(', ')}`
          )
          .join('\n')
      : '분석 기록 없음';

    const systemPrompt = `You are a Korean skincare expert and data analyst. Analyze the correlation between a user's daily skin diary entries and their skincare product usage. Return valid JSON only, no markdown.

Return this exact structure:
{
  "overallTrend": "improving|stable|worsening",
  "averageScore": 0.0,
  "insights": [
    {
      "type": "product_correlation|ingredient_warning|positive_effect|pattern",
      "title": "한국어 인사이트 제목",
      "description": "한국어 설명 2-3문장",
      "confidence": "high|medium|low",
      "actionable": "한국어 실천 가능한 조언"
    }
  ],
  "bestPeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "avgScore": 0.0,
    "possibleReason": "한국어 이유 설명"
  },
  "worstPeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "avgScore": 0.0,
    "possibleReason": "한국어 이유 설명"
  },
  "recommendations": ["한국어 권장사항1", "한국어 권장사항2", "한국어 권장사항3"],
  "summary": "전체 피부 패턴 요약 (한국어 3-4문장)"
}

Analysis rules:
- Look for temporal correlations: did skin score change 2-5 days after using certain products?
- Flag concerning patterns (e.g., score drops after using products with harsh ingredients)
- Identify positive patterns (e.g., consistently high scores during certain product use periods)
- Note recurring trouble spots and potential ingredient triggers
- Be specific and actionable, not generic`;

    const userPrompt = `피부 일기 기록:\n${diaryText}\n\n최근 분석한 제품 기록:\n${analysisText}\n\n위 데이터를 분석하여 인사이트를 제공해주세요. JSON만 반환하세요.`;

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
        temperature: 0.4,
        max_tokens: 2500,
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

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('diary-insights error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
