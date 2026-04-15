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
    const { troubleTypes, location, duration, skinProfile } = await req.json();

    if (!troubleTypes || troubleTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: '트러블 종류를 선택해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileLines: string[] = [];
    if (skinProfile?.skinType) profileLines.push(`피부 타입: ${skinProfile.skinType}`);
    if (skinProfile?.skinSensitivity) profileLines.push(`민감도: ${skinProfile.skinSensitivity}`);
    if (skinProfile?.specialCondition && skinProfile.specialCondition !== 'none') {
      const labels: Record<string, string> = {
        pregnant: '임신·수유 중',
        atopy: '아토피 피부염',
        rosacea: '로사세아',
        sensitive_skin: '극건성·민감',
      };
      profileLines.push(`특수 조건: ${labels[skinProfile.specialCondition] || skinProfile.specialCondition}`);
    }
    if (skinProfile?.allergies?.length > 0) profileLines.push(`기피 성분: ${skinProfile.allergies.join(', ')}`);

    const profileSummary = profileLines.length > 0 ? profileLines.join('\n') : null;

    const prompt = `당신은 대한민국 피부과 전문의 수준의 AI 어시스턴트입니다.
사용자의 피부 트러블을 분석하고, 약국에서 구매 가능한 일반의약품(OTC)과 스킨케어 루틴을 추천해주세요.

## 사용자 정보
트러블 종류: ${troubleTypes.join(', ')}
발생 위치: ${location || '미지정'}
지속 기간: ${duration || '미지정'}
${profileSummary ? `\n피부 프로필:\n${profileSummary}` : ''}

## 응답 형식 (반드시 JSON만 반환, 마크다운 없이)
{
  "causeAnalysis": "트러블 원인 분석 (2-3문장, 한국어)",
  "severity": "mild|moderate|severe",
  "needsDermatologist": false,
  "dermatologistReason": "병원 방문 필요 이유 (needsDermatologist=true일 때만)",
  "otcMedicines": [
    {
      "name": "제품명 (예: 후시딘, 박트로반, 에피듀오)",
      "type": "항생제연고|살리실산제제|벤조일퍼옥사이드|스테로이드|보습제|상처재생|기타",
      "activeIngredient": "주성분명",
      "purpose": "이 트러블에 효과적인 이유 (1-2문장)",
      "howToUse": "사용 방법 (구체적으로)",
      "frequency": "하루 몇 회",
      "duration": "사용 기간",
      "caution": "주의사항",
      "isOTC": true,
      "purchaseLocation": "약국",
      "priceRange": "가격대 (예: 5,000-15,000원)"
    }
  ],
  "avoidIngredients": [
    {
      "name": "성분명",
      "reason": "피해야 하는 이유"
    }
  ],
  "recommendedIngredients": [
    {
      "name": "성분명",
      "reason": "이 트러블에 도움이 되는 이유"
    }
  ],
  "routineMorning": [
    {
      "step": 1,
      "category": "세안|토너|세럼|보습|자외선차단|기타",
      "instruction": "구체적인 사용 방법",
      "keyIngredient": "핵심 성분"
    }
  ],
  "routineEvening": [
    {
      "step": 1,
      "category": "세안|토너|세럼|보습|기타",
      "instruction": "구체적인 사용 방법",
      "keyIngredient": "핵심 성분"
    }
  ],
  "lifestyleTips": [
    "생활 습관 팁 (예: 베개커버 매일 교체, 손으로 얼굴 만지지 않기 등)"
  ],
  "disclaimer": "이 정보는 의학적 진단을 대체하지 않습니다. 증상이 2주 이상 지속되거나 악화되면 피부과 전문의 상담을 권장합니다."
}

중요:
- otcMedicines는 반드시 대한민국 약국에서 구매 가능한 실제 제품만 추천
- 전문의약품(처방전 필요)은 절대 포함하지 말 것
- ${profileSummary?.includes('임신') ? '임신·수유 중이므로 안전한 성분만 추천할 것' : ''}
- severity가 severe이거나 낭종/결절 트러블이면 needsDermatologist=true
- JSON만 반환, 다른 텍스트 없이`;

    const aiResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      let errMsg = '분석 중 오류가 발생했습니다.';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.code === 'rate_limit_exceeded') {
          errMsg = 'AI 서비스가 잠시 과부하 상태입니다. 1분 후 다시 시도해주세요.';
        }
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: errMsg }),
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

    let result;
    try {
      const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      result = codeMatch ? JSON.parse(codeMatch[1].trim()) : JSON.parse(content.trim());
    } catch {
      const objMatch = content.match(/\{[\s\S]*\}/);
      result = objMatch ? JSON.parse(objMatch[0]) : null;
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'AI 응답 파싱 실패.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
