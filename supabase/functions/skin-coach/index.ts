const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

interface DiaryEntry {
  date: string;
  score: number;
  troubles: string[];
  notes?: string;
}

interface AnalysisEntry {
  product_name: string;
  product_brand?: string;
  overall_grade: string;
  created_at: string;
}

interface CabinetItem {
  product_name: string;
  product_brand?: string;
  category: string;
  is_morning: boolean;
  is_evening: boolean;
}

interface UserProfile {
  skinType?: string;
  skinConcerns?: string[];
  skinSensitivity?: string;
  ageGroup?: string;
  avoidIngredients?: string[];
  skinGoals?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      diaryEntries = [],
      analysisHistory = [],
      cabinetItems = [],
      userProfile = {},
      period = 'weekly',
      mode = 'coach',
      category = 'cleansing',
    }: {
      diaryEntries: DiaryEntry[];
      analysisHistory: AnalysisEntry[];
      cabinetItems: CabinetItem[];
      userProfile: UserProfile;
      period: string;
      mode: string;
      /** mode='cleansing' 또는 'careGuide'에서만 사용. cleansing|skincare|suncare|specialcare */
      category?: string;
    } = await req.json();

    // 데이터가 너무 적으면 짧은 답변 반환
    const hasEnoughData = diaryEntries.length >= 3 || analysisHistory.length >= 2;

    const profileStr = `
피부타입: ${userProfile.skinType ?? '미설정'}
피부고민: ${(userProfile.skinConcerns ?? []).join(', ') || '없음'}
민감도: ${userProfile.skinSensitivity ?? '보통'}
나이대: ${userProfile.ageGroup ?? '미설정'}
피하는성분: ${(userProfile.avoidIngredients ?? []).join(', ') || '없음'}
피부목표: ${(userProfile.skinGoals ?? []).join(', ') || '없음'}`.trim();

    const avgScore = diaryEntries.length > 0
      ? (diaryEntries.reduce((s, e) => s + (e.score ?? 3), 0) / diaryEntries.length).toFixed(1)
      : null;

    const troubleFreq: Record<string, number> = {};
    diaryEntries.forEach(e => (e.troubles ?? []).forEach(t => { troubleFreq[t] = (troubleFreq[t] ?? 0) + 1; }));
    const topTroubles = Object.entries(troubleFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, n]) => `${t}(${n}회)`);

    const scoreTrend = diaryEntries.slice(-7).map(e => e.score);
    const recentAvg = scoreTrend.length
      ? scoreTrend.reduce((a, b) => a + b, 0) / scoreTrend.length
      : null;

    const badProducts = analysisHistory.filter(h => h.overall_grade === 'bad').map(h => h.product_name);
    const goodProducts = analysisHistory.filter(h => h.overall_grade === 'good').map(h => h.product_name);

    const diaryContext = hasEnoughData
      ? `일기 데이터 (최근 ${diaryEntries.length}건):
- 평균 피부점수: ${avgScore}/5
- 최근 7일 평균: ${recentAvg?.toFixed(1) ?? '데이터 부족'}/5
- 반복 트러블: ${topTroubles.join(', ') || '없음'}`
      : '일기 데이터 부족 (3건 미만)';

    const analysisContext = analysisHistory.length > 0
      ? `분석 기록 (${analysisHistory.length}건):
- 주의 등급 제품: ${badProducts.slice(0, 3).join(', ') || '없음'}
- 안전 등급 제품: ${goodProducts.slice(0, 3).join(', ') || '없음'}`
      : '분석 기록 없음';

    const cabinetContext = cabinetItems.length > 0
      ? `보관함 제품 (${cabinetItems.length}개): ${cabinetItems.map(c => c.product_name).join(', ')}`
      : '보관함 비어있음';

    // ── 카테고리별 케어 가이드 모드: 피부 타입에 맞는 단계별 방법 + 추천 제품 ──
    // 하위 호환: mode='cleansing'은 그대로 동작 (기존 클라이언트 코드 보호)
    // 신규: mode='careGuide' + category='cleansing|skincare|suncare|specialcare'
    if (mode === 'cleansing' || mode === 'careGuide') {
      // category 정규화 (mode='cleansing'이면 무조건 cleansing 카테고리)
      const cat = mode === 'cleansing' ? 'cleansing' : category;

      const CATEGORY_DEF: Record<string, { label: string; focus: string; productCats: string }> = {
        cleansing: {
          label: '클렌징',
          focus: '클렌징 방법(1차/2차 클렌징, 빈도, 물 온도, 마사지 등)과 클렌징 제품 추천',
          productCats: 'cleansing_oil|cleansing_foam|cleansing_water|cleansing_balm|exfoliator',
        },
        skincare: {
          label: '스킨케어',
          focus: '기초 스킨케어 루틴(토너 → 세럼/앰플 → 크림) 단계와 사용 순서, 발림 방향, 흡수 시간 등',
          productCats: 'toner|essence|serum|ampoule|cream|emulsion|lotion',
        },
        suncare: {
          label: '썬케어',
          focus: '자외선 차단(자외선 지수별 SPF/PA 선택, 발림량 손가락 길이 두 마디 정도, 재도포 주기, 실내 사용) 가이드',
          productCats: 'sunscreen|sun_stick|sun_cushion|sun_essence',
        },
        specialcare: {
          label: '스페셜케어',
          focus: '주 1~3회 집중 케어(시트마스크, 클레이 마스크, 슬리핑팩, 부스터, 아이크림, 부분 트리트먼트)의 사용 빈도와 순서',
          productCats: 'sheet_mask|clay_mask|sleeping_pack|booster|eye_cream|treatment',
        },
      };
      const def = CATEGORY_DEF[cat] ?? CATEGORY_DEF.cleansing;

      const guidePrompt = `당신은 한국 피부과·뷰티 전문가 AI입니다.
사용자 프로필을 기반으로 피부 타입에 맞는 "${def.label} 가이드"를 제시하세요.
포커스: ${def.focus}

사용자 프로필:
${profileStr}

다음 JSON을 정확히 반환하세요:
{
  "overview": "이 피부 타입에 맞는 ${def.label} 핵심 1~2문장",
  "steps": [
    {
      "title": "단계명 (예: ${def.label}의 첫 단계)",
      "detail": "어떻게 할지 2문장 이내",
      "frequency": "빈도 (예: 저녁 매일 / 주 3회 등)"
    }
  ],
  "avoid": ["피해야 할 성분·습관 3개 이내"],
  "products": [
    { "name": "제품명", "brand": "브랜드", "category": "${def.productCats}", "reason": "추천 이유 1문장" }
  ]
}

제품은 한국에서 실제 구매 가능하며 피부 타입에 적합한 것을 3~5개 추천하세요.
JSON만 반환하세요.`;

      const cleansingResp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: '당신은 한국 피부과·뷰티 전문가입니다. JSON만 반환합니다.' },
            { role: 'user', content: guidePrompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        }),
      });

      if (!cleansingResp.ok) throw new Error(`Groq error: ${cleansingResp.status}`);
      const cleansingData = await cleansingResp.json();
      const cleansingContent = cleansingData.choices?.[0]?.message?.content ?? '{}';
      let cleansingResult: Record<string, unknown> = {};
      try { cleansingResult = JSON.parse(cleansingContent); } catch {
        const m = cleansingContent.match(/\{[\s\S]*\}/);
        if (m) cleansingResult = JSON.parse(m[0]);
      }

      return new Response(
        JSON.stringify(cleansingResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── shopping 모드: 추가 구매 추천 ──
    if (mode === 'shopping') {
      const shoppingPrompt = `당신은 한국 화장품 큐레이터 AI입니다.

사용자 프로필:
${profileStr}

${cabinetContext}

${diaryContext}

사용자가 현재 보유한 제품들을 분석하고, 피부 고민과 환경에 맞춰 추가로 구매하면 좋을 제품을 추천해주세요.

다음 JSON을 정확히 반환하세요:
{
  "summary": "현재 보관함 분석 요약 (2문장)",
  "missingSteps": [
    {
      "step": "부족한 단계명 (예: 세럼, 아이크림)",
      "reason": "왜 필요한지 1문장",
      "recommendations": [
        { "name": "구체적 제품명", "brand": "브랜드", "reason": "추천 이유 1문장", "priceRange": "가격대 (예: 2~3만원)" }
      ]
    }
  ],
  "upgradeAdvice": [
    {
      "currentProduct": "현재 사용 중인 제품명",
      "suggestion": "업그레이드 제안 (1문장)",
      "alternatives": [
        { "name": "대안 제품명", "brand": "브랜드", "reason": "이유 1문장" }
      ]
    }
  ],
  "seasonalPick": {
    "title": "계절/환경 추천 (10자 이내)",
    "products": [
      { "name": "제품명", "brand": "브랜드", "reason": "이유 1문장" }
    ]
  }
}

JSON만 반환하세요.`;

      const shoppingResp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: '당신은 한국 화장품 큐레이션 전문가입니다. JSON만 반환합니다.' },
            { role: 'user', content: shoppingPrompt },
          ],
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      });

      if (!shoppingResp.ok) throw new Error(`Groq error: ${shoppingResp.status}`);
      const shoppingData = await shoppingResp.json();
      const shoppingContent = shoppingData.choices?.[0]?.message?.content ?? '{}';
      let shoppingResult: Record<string, unknown> = {};
      try { shoppingResult = JSON.parse(shoppingContent); } catch {
        const m = shoppingContent.match(/\{[\s\S]*\}/);
        if (m) shoppingResult = JSON.parse(m[0]);
      }

      return new Response(
        JSON.stringify(shoppingResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = `당신은 친절하고 전문적인 한국 피부관리 AI 코치입니다.

사용자 프로필:
${profileStr}

${diaryContext}

${analysisContext}

${cabinetContext}

위 데이터를 종합하여 사용자에게 맞춤형 피부 코칭을 제공해주세요.

다음 JSON을 정확히 반환하세요:
{
  "greeting": "한 줄 인사 (이름 제외, 이모지 포함, 15자 이내)",
  "skinStatus": "현재 피부 상태 요약 (2-3문장, 데이터 기반)",
  "keyInsights": [
    { "icon": "이모지", "title": "인사이트 제목 (10자 이내)", "body": "구체적인 분석 내용 (30자 이내)" }
  ],
  "weeklyAction": {
    "title": "${period === 'weekly' ? '이번 주' : '이번 달'} 집중 케어",
    "actions": ["구체적인 행동1 (20자 이내)", "구체적인 행동2", "구체적인 행동3"]
  },
  "productAdvice": "보관함 제품 기반 조언 (2문장, 없으면 일반 조언)",
  "encouragement": "응원 메시지 (1문장, 이모지 포함)",
  "dataQuality": "${hasEnoughData ? 'sufficient' : 'insufficient'}"
}

JSON만 반환하세요.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '당신은 한국 피부관리 전문가입니다. JSON만 반환합니다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

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
    console.error('skin-coach error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
