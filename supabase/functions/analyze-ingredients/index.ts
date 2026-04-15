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
    const { ingredientsText, productName, productBrand, userProfile } = await req.json();

    if ((!ingredientsText || ingredientsText.trim().length < 5) && (!productName || productName.trim().length < 2)) {
      return new Response(
        JSON.stringify({ error: '제품명 또는 전성분을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const noIngredients = !ingredientsText || ingredientsText.trim().length < 5;
    const profileSummary = userProfile ? buildProfileSummary(userProfile) : null;

    const systemMessage = buildSystemMessage(profileSummary);
    const userMessage = noIngredients
      ? buildSearchMessage(productName, productBrand, profileSummary)
      : buildAnalysisMessage(ingredientsText, productName, productBrand, profileSummary);

    const aiResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Groq API error:', errText);
      let errMsg = 'AI 분석 중 오류가 발생했습니다.';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.code === 'rate_limit_exceeded') {
          errMsg = 'AI 분석 서비스가 잠시 과부하 상태입니다. 1분 후 다시 시도해주세요.';
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
        JSON.stringify({ error: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = extractJson(content);
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'AI 응답 파싱 실패. 잠시 후 다시 시도해주세요.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.groundingUsed = false;

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

function buildSystemMessage(profileSummary: string | null): string {
  return `You are a Korean cosmetics ingredient safety analyst. Always respond with valid JSON only, no markdown, no explanation outside JSON.

Analyze cosmetic ingredients and return this exact JSON structure:
{
  "productName": "string",
  "productBrand": "string",
  "ingredientsFound": true,
  "ingredients": [
    {
      "name": "성분명(Korean)",
      "name_en": "INCI name",
      "safety": "safe|caution|danger",
      "irritancy": 0,
      "comedogenicity": 0,
      "function": "기능(Korean)",
      "description": "설명(Korean, 1-2 sentences)"
    }
  ],
  "interactions": [
    {
      "ingredient_a": "string",
      "ingredient_b": "string",
      "type": "conflict|caution|synergy",
      "severity": "low|medium|high",
      "description": "설명(Korean)"
    }
  ],
  "keyIngredients": [
    { "name": "string", "role": "Korean role" }
  ],
  "overallGrade": "good|moderate|bad",
  "summary": "Korean summary",
  ${profileSummary ? `"skinFit": {
    "score": 0,
    "label": "최적|적합|보통|주의",
    "reason": "Korean 2-3 sentences",
    "warnings": []
  },` : ''}
  "productTags": {
    "skin_types": [],
    "skin_concerns": [],
    "suitable_sensitivity": [],
    "suitable_age_groups": [],
    "avoid_skin_conditions": [],
    "description_ko": "Korean"
  }
}

Safety rules:
- "safe": generally safe, widely used
- "caution": may irritate sensitive skin
- "danger": known irritants, allergens, parabens, formaldehyde releasers, strong fragrances

skin_types choices: ["건성","지성","복합성","민감성","중성"]
skin_concerns choices: ["보습","건조","여드름","트러블","모공","탄력","주름","색소침착","홍조","민감","각질","미백","진정"]
suitable_sensitivity choices: ["very_sensitive","sensitive","normal","low"]
suitable_age_groups choices: ["10s","20s","30s","40s","50s"] — empty if all ages
avoid_skin_conditions choices: ["acne","rosacea","eczema","dry_patch"]
${profileSummary ? `
skinFit score guide:
- 80-100: 최적 — ingredients actively benefit this profile
- 60-79: 적합 — mostly suitable
- 40-59: 보통 — some mismatch
- 0-39: 주의 — conflicts with this profile
` : ''}`;
}

function buildSearchMessage(productName: string, productBrand: string | undefined, profileSummary: string | null): string {
  return `Product: ${productName}${productBrand ? ' by ' + productBrand : ''}

No ingredient list provided. Based on your knowledge of this Korean cosmetic product, identify its likely ingredients and analyze them.
If you don't know exact ingredients, use typical ingredients for this product type.
Set "ingredientsFound": true if you know the product, false if guessing.

${profileSummary ? `User skin profile:\n${profileSummary}\n\nInclude skinFit analysis based on this profile.` : ''}

Return JSON only.`;
}

function buildAnalysisMessage(ingredientsText: string, productName: string | undefined, productBrand: string | undefined, profileSummary: string | null): string {
  return `Product: ${productName || 'Unknown'}${productBrand ? ' by ' + productBrand : ''}

Ingredient list:
${ingredientsText}

${profileSummary ? `User skin profile:\n${profileSummary}\n\nInclude skinFit analysis.` : ''}

Analyze all ingredients. Return JSON only.`;
}

function extractJson(text: string): Record<string, unknown> | null {
  try {
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) return JSON.parse(codeMatch[1].trim());
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function buildProfileSummary(profile: Record<string, unknown>): string {
  const lines: string[] = [];
  if (profile.skinType) lines.push(`피부 타입: ${profile.skinType}`);
  if (Array.isArray(profile.skinConcerns) && profile.skinConcerns.length > 0)
    lines.push(`피부 고민: ${profile.skinConcerns.join(', ')}`);
  if (Array.isArray(profile.concernPriority) && profile.concernPriority.length > 0)
    lines.push(`1순위 고민: ${profile.concernPriority[0]}`);
  if (profile.skinSensitivity) lines.push(`민감도: ${profile.skinSensitivity}`);
  if (profile.skinCondition) lines.push(`피부 상태: ${profile.skinCondition}`);
  if (profile.ageGroup) lines.push(`연령대: ${profile.ageGroup}`);
  if (profile.specialCondition && profile.specialCondition !== 'none') {
    const conditionLabels: Record<string, string> = {
      pregnant: '임신·수유 중 (레티놀, 살리실산, 벤조일퍼옥사이드 등 금기 성분 강화 경고 필요)',
      atopy: '아토피 피부염 (SLS/SLES, 인공향료, 에탄올, 방부제 민감 반응 우선 체크)',
      rosacea: '로사세아 (알코올, 향료, 멘톨, 유칼립투스, 강력 산 성분 홍조 유발 주의)',
      sensitive_skin: '극건성·민감 피부 (자극 성분 전반 강화 경고)',
    };
    lines.push(`특수 조건: ${conditionLabels[profile.specialCondition as string] || profile.specialCondition}`);
  }
  if (Array.isArray(profile.allergies) && profile.allergies.length > 0)
    lines.push(`알레르기/기피 성분: ${profile.allergies.join(', ')}`);
  if (Array.isArray(profile.avoidIngredients) && profile.avoidIngredients.length > 0)
    lines.push(`피하는 성분: ${profile.avoidIngredients.join(', ')}`);
  return lines.join('\n');
}
