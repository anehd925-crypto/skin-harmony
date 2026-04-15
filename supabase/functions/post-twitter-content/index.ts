import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ────────────────────────────────────────────────────────────
// 요일·계절 컨텍스트 정보
// ────────────────────────────────────────────────────────────
function getContextInfo() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const month = now.getMonth() + 1;
  const season =
    month >= 3 && month <= 5 ? "봄" :
    month >= 6 && month <= 8 ? "여름" :
    month >= 9 && month <= 11 ? "가을" : "겨울";

  const typeMap: Record<number, { type: string; label: string }> = {
    0: { type: "skin_type_tip",    label: "피부 타입별 추천·주의 성분" },
    1: { type: "ingredient_info",  label: "오늘의 성분 정보 (효능·주의)" },
    2: { type: "conflict_warning", label: "함께 쓰면 안 되는 성분 조합 경고" },
    3: { type: "ingredient_info",  label: "오늘의 성분 정보 (효능·주의)" },
    4: { type: "app_intro",        label: "BeautyLens 앱 기능 시나리오 소개" },
    5: { type: "conflict_warning", label: "함께 쓰면 안 되는 성분 조합 경고" },
    6: { type: "trend",            label: `${season} 시즌 트렌드 성분 정보` },
  };

  return { season, ...typeMap[now.getDay()] };
}

// ────────────────────────────────────────────────────────────
// Groq AI로 트윗 내용 생성
// ────────────────────────────────────────────────────────────
async function generateTweet(contentType: string, season: string): Promise<string> {
  const appUrl = "https://beautylens.app?utm_source=twitter&utm_medium=organic&utm_campaign=daily_post";

  const typePrompts: Record<string, string> = {
    ingredient_info: `
오늘의 뷰티 성분 정보를 알려주는 트윗을 작성하세요.
특정 성분 1개 선택 (나이아신아마이드, 레티놀, 세라마이드, 히알루론산, AHA, BHA, 비타민C, 판테놀, 아데노신, 녹차추출물 중 하나).
효능 2가지, 주의사항 1가지, 어울리는 피부 타입 언급.`,

    conflict_warning: `
화장품 성분 충돌 경고 트윗을 작성하세요.
함께 쓰면 효과가 줄거나 자극이 생기는 성분 조합 1가지 선택.
왜 문제인지 쉬운 설명, 올바른 사용법(대안) 제시.
예시 조합: 레티놀+AHA, 비타민C+나이아신아마이드(고농도), 레티놀+비타민C, BHA+레티놀`,

    skin_type_tip: `
피부 타입별 성분 팁 트윗을 작성하세요.
건성/지성/복합성/민감성 중 하나 선택.
해당 피부 타입이 피해야 할 성분 2가지, 좋은 성분 2가지.`,

    app_intro: `
BeautyLens 앱 기능을 자연스럽게 소개하는 트윗을 작성하세요.
직접 광고 금지. 실제 사용 시나리오 형태로.
"올리브영 URL을 붙여넣으면 내 피부 적합도를 분석해준다"는 점 또는
"루틴 제품들의 성분 궁합을 한 번에 확인"하는 기능 소개.`,

    trend: `
${season} 시즌에 주목받는 뷰티 성분 트렌드 트윗을 작성하세요.
${season}에 특히 중요한 성분 1~2가지, 계절과의 연관성 설명, 사용 시 주의사항 1가지.`,
  };

  const typePrompt = typePrompts[contentType] ?? typePrompts["ingredient_info"];

  const prompt = `
당신은 뷰티·스킨케어 성분 전문 SNS 에디터입니다.
BeautyLens라는 AI 전성분 분석 앱의 공식 X(트위터) 계정 포스팅을 작성합니다.

[오늘의 콘텐츠 방향]
${typePrompt}

[반드시 지켜야 할 규칙]
1. 한국어 작성
2. 전체 230자 이내 (해시태그 포함)
3. 이모지 2~3개 사용
4. 마지막 줄: 앱 관련 1문장 + URL (${appUrl})
5. 해시태그 3~5개 (#스킨케어 #전성분 필수 포함)
6. 직접 광고 문구 금지 ("다운로드하세요", "설치하세요" 사용 금지)
7. 정보성·유용성 중심

포스팅 내용만 출력하세요. 다른 설명 없이.
`.trim();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API 오류 ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ────────────────────────────────────────────────────────────
// X API OAuth 1.0a 서명 생성
// ────────────────────────────────────────────────────────────
async function buildOAuthHeader(method: string, url: string): Promise<string> {
  const consumerKey    = Deno.env.get("TWITTER_API_KEY")!;
  const consumerSecret = Deno.env.get("TWITTER_API_SECRET")!;
  const accessToken    = Deno.env.get("TWITTER_ACCESS_TOKEN")!;
  const tokenSecret    = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce     = crypto.randomUUID().replace(/-/g, "");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");

  const baseString  = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey  = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const keyData = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBuf  = await crypto.subtle.sign("HMAC", keyData, new TextEncoder().encode(baseString));
  const sig     = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  oauthParams.oauth_signature = sig;

  return "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");
}

// ────────────────────────────────────────────────────────────
// X에 트윗 게시
// ────────────────────────────────────────────────────────────
async function postTweet(text: string): Promise<string> {
  const url = "https://api.twitter.com/2/tweets";
  const auth = await buildOAuthHeader("POST", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter API 오류 ${res.status}: ${err}`);
  }

  const result = await res.json();
  return result.data.id as string;
}

// ────────────────────────────────────────────────────────────
// 메인 핸들러
// ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ctx = getContextInfo();
  let tweetId:   string | null = null;
  let tweetText: string | null = null;

  try {
    tweetText = await generateTweet(ctx.type, ctx.season);
    tweetId   = await postTweet(tweetText);

    await supabase.from("twitter_post_logs").insert({
      tweet_id:     tweetId,
      content:      tweetText,
      content_type: ctx.type,
      status:       "success",
      posted_at:    new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, tweet_id: tweetId, content: tweetText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("포스팅 실패:", msg);

    await supabase.from("twitter_post_logs").insert({
      tweet_id:      tweetId,
      content:       tweetText,
      content_type:  ctx.type,
      status:        "failed",
      error_message: msg,
      posted_at:     new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
