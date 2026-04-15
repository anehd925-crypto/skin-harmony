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
      period = 'weekly', // 'weekly' | 'monthly'
    }: {
      diaryEntries: DiaryEntry[];
      analysisHistory: AnalysisEntry[];
      cabinetItems: CabinetItem[];
      userProfile: UserProfile;
      period: string;
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
