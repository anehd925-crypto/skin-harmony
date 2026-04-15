import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CabinetItem {
  id: string;
  product_name: string;
  product_brand: string | null;
  category: string;
  step_order: number;
  is_morning: boolean;
  is_evening: boolean;
}

interface WeatherData {
  temp: number;          // °C
  humidity: number;      // %
  dust: 'good' | 'moderate' | 'bad' | 'very_bad'; // 미세먼지
  uv: number;            // 0~11
  weather: string;       // 맑음|흐림|비|눈 등
  city: string;
}

interface WeatherRoutineRequest {
  weather: WeatherData;
  cabinetItems: CabinetItem[];
  skinProfile?: {
    skinType?: string;
    skinConcerns?: string[];
    skinSensitivity?: string;
  };
  period: 'morning' | 'evening';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: WeatherRoutineRequest = await req.json();
    const { weather, cabinetItems, skinProfile, period } = body;

    if (!weather || !cabinetItems) {
      return new Response(JSON.stringify({ error: '날씨 데이터와 보관함 정보가 필요합니다.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const periodLabel = period === 'morning' ? '아침' : '저녁';
    const relevantItems = cabinetItems.filter(i =>
      period === 'morning' ? i.is_morning : i.is_evening
    ).sort((a, b) => a.step_order - b.step_order);

    const itemList = relevantItems
      .map(i => `- ${i.product_name}${i.product_brand ? ` (${i.product_brand})` : ''} [${i.category}]`)
      .join('\n');

    const dustMap = { good: '좋음', moderate: '보통', bad: '나쁨', very_bad: '매우 나쁨' };
    const weatherSummary = `기온 ${weather.temp}°C, 습도 ${weather.humidity}%, 미세먼지 ${dustMap[weather.dust]}, 자외선 지수 ${weather.uv}, 날씨 ${weather.weather}`;
    const profileSummary = skinProfile ? [
      skinProfile.skinType && `피부 타입: ${skinProfile.skinType}`,
      skinProfile.skinConcerns?.length && `피부 고민: ${skinProfile.skinConcerns.join(', ')}`,
      skinProfile.skinSensitivity && `민감도: ${skinProfile.skinSensitivity}`,
    ].filter(Boolean).join(', ') : '';

    const prompt = `당신은 뷰티 전문 스킨케어 컨설턴트입니다.
사용자의 ${periodLabel} 루틴 제품 목록과 오늘의 날씨 환경을 분석하여, 최적의 루틴 조합을 추천해주세요.

## 오늘의 날씨
${weatherSummary}

## 사용자 보관함 (${periodLabel})
${itemList || '등록된 제품 없음'}

${profileSummary ? `## 피부 프로필\n${profileSummary}` : ''}

## 날씨 기반 분석 지침
- 기온 낮을 때(15°C 미만): 보습 강화 제품 우선 추천
- 기온 높을 때(28°C 이상): 가볍고 논코메도제닉 제품 우선
- 습도 낮을 때(40% 미만): 보습 레이어링 강조
- 습도 높을 때(70% 이상): 가벼운 수분감 제품, 보습 순서 단축 가능
- 미세먼지 나쁨/매우 나쁨: 클렌징 단계 강조, SPF+PA 필수 언급
- 자외선 5이상: 자외선 차단제 필수 포함 (없으면 추가 구매 추천)
- 자외선 8이상: 실내 SPF 50+ 권장
- 날씨 비: 방수 효과 제품 추천, 여벌 수분케어 필요 언급

## 응답 형식 (JSON만, 마크다운 없이)
{
  "weatherAlert": "날씨 한줄 알림 (이모지 포함, 예: '☀️ 자외선 강해요! 선크림 필수')",
  "weatherTips": ["오늘 날씨 기반 피부 케어 팁 1", "팁 2"],
  "recommendedRoutine": [
    {
      "step": 1,
      "productName": "보관함의 제품명 또는 추천 제품 유형",
      "isFromCabinet": true,
      "reason": "이 날씨에 이 제품을 쓰는 이유 (1줄)"
    }
  ],
  "extraRecommendations": [
    {
      "productType": "추가 구매/사용 추천 제품 유형",
      "reason": "오늘 날씨에 필요한 이유",
      "urgency": "high|medium|low"
    }
  ],
  "overallAdvice": "오늘 날씨 기반 전체 피부 케어 조언 (2-3문장)"
}`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    const groqData = await response.json();
    const content = groqData.choices?.[0]?.message?.content ?? '{}';
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('weather-routine error:', err);
    return new Response(JSON.stringify({ error: '처리 중 오류가 발생했습니다.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
