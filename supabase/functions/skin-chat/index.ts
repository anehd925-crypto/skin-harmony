/**
 * skin-chat: 홈 AI 피부 비서 대화 Edge Function
 *
 * 입력:
 *  - messages: [{ role: 'user'|'assistant'|'system', content: string }, ...]
 *  - userProfile: 프로필(피부타입, 고민, 민감도 등)
 *  - recentAnalyses: 최근 분석 요약(선택)
 *  - cabinetSummary: 보관함 상위 요약(선택)
 *
 * 출력: { reply: string }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
interface UserProfile {
  skinType?: string;
  skinConcerns?: string[];
  skinSensitivity?: string;
  ageGroup?: string;
  avoidIngredients?: string[];
  skinGoals?: string[];
}
interface AnalysisSummary { product_name: string; product_brand?: string; overall_grade?: string; }
interface CabinetSummary { product_name: string; product_brand?: string; category?: string; }

const buildSystemPrompt = (
  profile: UserProfile,
  analyses: AnalysisSummary[],
  cabinet: CabinetSummary[],
): string => {
  const concerns = (profile.skinConcerns ?? []).join(', ') || '미설정';
  const goals = (profile.skinGoals ?? []).join(', ') || '미설정';
  const avoids = (profile.avoidIngredients ?? []).join(', ') || '없음';

  const analysisLines = analyses.slice(0, 5).map(a =>
    `- ${a.product_brand ? a.product_brand + ' ' : ''}${a.product_name} (등급: ${a.overall_grade ?? '미정'})`
  ).join('\n') || '- 최근 분석 이력 없음';

  const cabinetLines = cabinet.slice(0, 8).map(c =>
    `- ${c.product_brand ? c.product_brand + ' ' : ''}${c.product_name}${c.category ? ` (${c.category})` : ''}`
  ).join('\n') || '- 등록된 제품 없음';

  return `당신은 BeautyLens의 AI 피부 비서입니다.
사용자의 프로필과 사용 이력을 고려해 정확하고 실용적인 피부/화장품 조언을 한국어로 제공합니다.

사용자 프로필:
- 피부 타입: ${profile.skinType ?? '미설정'}
- 민감도: ${profile.skinSensitivity ?? '미설정'}
- 연령대: ${profile.ageGroup ?? '미설정'}
- 주요 고민: ${concerns}
- 스킨케어 목표: ${goals}
- 기피 성분: ${avoids}

최근 분석 제품(최대 5건):
${analysisLines}

보관함 제품(최대 8건):
${cabinetLines}

답변 규칙:
1. 한국어로 친근하고 간결하게 답합니다(3~5문장 권장).
2. 사용자 프로필과 실제 보관함/분석 이력을 근거로 답변합니다.
3. 의료 진단·처방은 하지 않고, 피부과 진료가 필요해 보이면 권유합니다.
4. 특정 제품을 단정적으로 권하지 않고, 성분·원리 중심으로 설명합니다.
5. 불확실할 때는 "가능성이 있다" 같은 보수적 표현을 씁니다.`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      messages = [],
      userProfile = {},
      recentAnalyses = [],
      cabinetSummary = [],
    }: {
      messages: ChatMessage[];
      userProfile: UserProfile;
      recentAnalyses: AnalysisSummary[];
      cabinetSummary: CabinetSummary[];
    } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = buildSystemPrompt(userProfile, recentAnalyses, cabinetSummary);

    // 최근 20개 메시지로 제한(토큰 과다 방지)
    const trimmed = messages.slice(-20);

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmed,
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[skin-chat] Groq error:', groqRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await groqRes.json();
    const reply: string = data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!reply) {
      return new Response(
        JSON.stringify({ error: '빈 응답이 반환되었습니다.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[skin-chat] exception:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
