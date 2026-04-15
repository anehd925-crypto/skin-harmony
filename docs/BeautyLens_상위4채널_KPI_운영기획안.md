# BeautyLens 마케팅 상위 4개 채널 KPI 및 구체적 운영 기획안

> 효과성·효율성·자동화 가능성을 기준으로 선정한 상위 4개 채널 운영 전략

**문서 작성일**: 2026년 4월 15일

---

## 선정 기준 및 상위 4개 채널

### 선정 기준 (3가지)

| 기준 | 설명 |
|------|------|
| **효과성** | 실제 앱 접속·회원가입으로 이어지는 전환 가능성 |
| **효율성** | 투입 시간·비용 대비 기대 성과 비율 |
| **자동화 가능성** | 1인 운영 상황에서 반복 작업을 자동화할 수 있는 정도 |

### 선정 결과

| 순위 | 채널 | 선정 이유 요약 |
|------|------|--------------|
| **1위** | X(트위터) 자동 포스팅 | 완전 자동화 가능, 성분 정보 공유 문화 활발, API 제공 |
| **2위** | 네이버 블로그 SEO | 장기 검색 유입 자산, AI 초안 자동 생성 가능, 비용 없음 |
| **3위** | 앱 내 바이럴 루프 (공유 기능 강화) | 사용자가 직접 홍보, 추가 비용 없이 지수적 성장 가능 |
| **4위** | 네이버 지식iN + 뷰티 카페 참여 | 즉각 유입, 타겟층 집중, 채택 답변의 장기 노출 효과 |

---

---

# 채널 1. X(트위터) 자동 포스팅

---

## 1-1. KPI 설정

| 지표 | 측정 방법 | 1개월 목표 | 3개월 목표 | 6개월 목표 |
|------|----------|-----------|-----------|-----------|
| 팔로워 수 | X 계정 분석 탭 | 100명 | 500명 | 2,000명 |
| 월간 포스트 수 | 포스팅 로그 DB | 60개 | 90개 | 90개 |
| 평균 인게이지먼트율 | (좋아요+RT+댓글) ÷ 노출 × 100 | 1% | 2% | 3% |
| 프로필 링크 클릭 수 | X 애널리틱스 | 50회/월 | 300회/월 | 1,000회/월 |
| X 경유 앱 접속자 | UTM 파라미터 추적 | 30명/월 | 150명/월 | 600명/월 |

> **핵심 KPI**: "X 경유 앱 접속자 수" — 팔로워·좋아요가 많아도 앱에 유입되지 않으면 의미 없음

---

## 1-2. 콘텐츠 전략

### 콘텐츠 믹스 (주간 기준, 총 14~21개)

| 유형 | 빈도 | 목적 |
|------|------|------|
| 오늘의 성분 정보 | 매일 1회 | 팔로워 유지·신규 노출 |
| 성분 충돌 경고 | 주 3회 | 공유율 높음, 신뢰도 구축 |
| 피부 타입별 성분 팁 | 주 2회 | 타겟층 세분화 |
| 앱 기능 소개 (시나리오형) | 주 1회 | 앱 유입 직접 유도 |
| 트렌드/계절 성분 정보 | 주 1회 | 시의성 있는 노출 확대 |
| 사용자 질문 답변 | 수시 | 커뮤니티 활성화 |

### 해시태그 전략
- 기본 태그 (매 포스팅 공통): `#스킨케어` `#전성분` `#뷰티`
- 주제별 추가 태그 예시:
  - 성분 정보: `#나이아신아마이드` `#레티놀` `#비타민C`
  - 피부 타입: `#건성피부` `#지성피부` `#민감성피부`
  - 상황: `#여드름` `#임신스킨케어` `#피부고민`

---

## 1-3. 자동화 구현 매뉴얼

### 전체 구조

```
[콘텐츠 DB (Supabase)]
  → 매일 오전 8시: Supabase Cron이 실행
  → AI(Groq API)가 당일 콘텐츠 자동 생성
  → X API로 자동 포스팅
  → 포스팅 결과 로그 저장
```

---

### Step 1. X Developer 계정 및 API 키 발급

#### 1-1. X Developer Portal 접속
1. 브라우저에서 `developer.twitter.com` 접속
2. 우측 상단 "Sign in" → 기존 X 계정으로 로그인
3. "Apply for access" 또는 "Developer Portal" 클릭

#### 1-2. 앱 생성 및 API 키 발급
1. Developer Portal 좌측 메뉴 "Projects & Apps" → "Create App"
2. 앱 이름: `BeautyLens Marketing Bot`
3. 사용 목적 선택: "Making a bot" 또는 "Building tools for my own use"
4. 생성 완료 후 "Keys and Tokens" 탭 클릭
5. 아래 4가지 값을 복사해 안전한 곳에 보관

```
API Key (Consumer Key)         : xxxxxxxxxxxxxxxxxxxx
API Key Secret (Consumer Secret): xxxxxxxxxxxxxxxxxxxx
Access Token                   : xxxxxxxxxxxxxxxxxxxx
Access Token Secret            : xxxxxxxxxxxxxxxxxxxx
```

#### 1-3. 앱 권한 설정
1. "App Settings" → "User authentication settings" → "Edit"
2. App permissions: **Read and Write** 선택 (쓰기 권한 필수)
3. 저장

---

### Step 2. Supabase에 환경변수 등록

1. Supabase 대시보드 접속 → 해당 프로젝트 선택
2. 좌측 메뉴 "Edge Functions" → "Secrets" (또는 "Settings" → "Secrets")
3. 아래 항목 각각 추가

| 키 이름 | 값 |
|--------|-----|
| `TWITTER_API_KEY` | API Key 값 |
| `TWITTER_API_SECRET` | API Key Secret 값 |
| `TWITTER_ACCESS_TOKEN` | Access Token 값 |
| `TWITTER_ACCESS_TOKEN_SECRET` | Access Token Secret 값 |

---

### Step 3. 콘텐츠 생성 Edge Function 작성

Supabase Edge Functions에 새 함수를 생성합니다.

#### 파일 위치
`supabase/functions/post-twitter-content/index.ts`

#### 코드 내용

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// ── 1. 오늘의 콘텐츠 AI 생성 ──────────────────────────────
async function generateTweetContent(): Promise<string> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=일, 1=월, ...

  // 요일별 콘텐츠 유형 결정
  const contentTypes = [
    "피부 타입별 추천 성분 (일요일)",
    "오늘의 성분 정보 (월요일)",
    "성분 충돌 경고 (화요일)",
    "오늘의 성분 정보 (수요일)",
    "앱 기능 소개 시나리오 (목요일)",
    "성분 충돌 경고 (금요일)",
    "트렌드 성분 정보 (토요일)",
  ];
  const contentType = contentTypes[dayOfWeek];

  const prompt = `
당신은 뷰티·스킨케어 성분 전문가입니다.
BeautyLens라는 AI 피부 성분 분석 앱을 위한 X(트위터) 포스팅을 작성하세요.

오늘의 콘텐츠 유형: ${contentType}
현재 계절: ${today.getMonth() >= 3 && today.getMonth() <= 5 ? "봄" : today.getMonth() >= 6 && today.getMonth() <= 8 ? "여름" : today.getMonth() >= 9 && today.getMonth() <= 11 ? "가을" : "겨울"}

규칙:
1. 한국어로 작성
2. 230자 이내 (해시태그 포함)
3. 실용적이고 유용한 정보 제공
4. 마지막에 "BeautyLens에서 무료 분석" 또는 앱 관련 1줄 포함
5. 관련 해시태그 3~5개 포함 (#스킨케어 #전성분 등)
6. 이모지 2~3개 사용
7. 직접적인 광고 문구 금지, 정보성 콘텐츠 위주

포스팅 내용만 출력하세요. 다른 설명 없이.
  `.trim();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ── 2. X API OAuth 1.0a 서명 생성 ──────────────────────────
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const hmac = createHmac("sha1", signingKey);
  hmac.update(baseString);
  return btoa(String.fromCharCode(...new Uint8Array(hmac.digest())));
}

// ── 3. X에 트윗 포스팅 ────────────────────────────────────
async function postTweet(text: string): Promise<{ id: string; text: string }> {
  const url = "https://api.twitter.com/2/tweets";
  const method = "POST";
  
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
  const oauthNonce = Math.random().toString(36).substring(2);
  
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: Deno.env.get("TWITTER_API_KEY")!,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_token: Deno.env.get("TWITTER_ACCESS_TOKEN")!,
    oauth_version: "1.0",
  };
  
  const signature = generateOAuthSignature(
    method, url, oauthParams,
    Deno.env.get("TWITTER_API_SECRET")!,
    Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")!
  );
  
  oauthParams.oauth_signature = signature;
  
  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");
  
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter API 오류: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  return result.data;
}

// ── 4. 메인 핸들러 ────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // AI로 콘텐츠 생성
    const tweetText = await generateTweetContent();
    
    // X에 포스팅
    const tweet = await postTweet(tweetText);
    
    // 결과 DB 저장
    await supabase.from("twitter_post_logs").insert({
      tweet_id: tweet.id,
      content: tweetText,
      posted_at: new Date().toISOString(),
      status: "success",
    });
    
    return new Response(
      JSON.stringify({ success: true, tweet_id: tweet.id, content: tweetText }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("포스팅 실패:", error);
    
    // 실패 로그 저장
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("twitter_post_logs").insert({
      content: null,
      posted_at: new Date().toISOString(),
      status: "failed",
      error_message: error.message,
    });
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

### Step 4. 포스팅 로그 테이블 생성 (DB 마이그레이션)

Supabase SQL 편집기에서 아래 쿼리 실행:

```sql
CREATE TABLE twitter_post_logs (
  id           BIGSERIAL PRIMARY KEY,
  tweet_id     TEXT,
  content      TEXT,
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed'
  error_message TEXT,
  likes        INTEGER DEFAULT 0,
  retweets     INTEGER DEFAULT 0,
  impressions  INTEGER DEFAULT 0,
  updated_at   TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_twitter_logs_posted_at ON twitter_post_logs(posted_at DESC);
CREATE INDEX idx_twitter_logs_status ON twitter_post_logs(status);
```

---

### Step 5. Supabase Cron으로 자동 스케줄 등록

Supabase SQL 편집기에서 아래 쿼리 실행 (pg_cron 사용):

```sql
-- pg_cron 활성화 (이미 활성화된 경우 생략)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매일 오전 8시 자동 포스팅 (KST = UTC+9, 즉 UTC 23:00 = KST 08:00)
SELECT cron.schedule(
  'post-twitter-morning',           -- 스케줄 이름
  '0 23 * * *',                     -- UTC 23:00 = KST 08:00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/post-twitter-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 매일 정오 추가 포스팅 원할 경우 (선택)
SELECT cron.schedule(
  'post-twitter-noon',
  '0 3 * * *',                      -- UTC 03:00 = KST 12:00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/post-twitter-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

### Step 6. 배포 및 테스트

터미널에서 아래 명령 순서대로 실행:

```bash
# 1. Supabase CLI 설치 확인
supabase --version

# 2. 로그인
supabase login

# 3. Edge Function 배포
supabase functions deploy post-twitter-content

# 4. 수동으로 한 번 테스트 실행
supabase functions invoke post-twitter-content --body '{}'

# 5. 로그 확인
supabase functions logs post-twitter-content
```

---

### Step 7. 모니터링 방법

**매주 확인 사항:**
1. Supabase 대시보드 → `twitter_post_logs` 테이블에서 status 확인
2. X 계정 Analytics 탭에서 인게이지먼트율 확인
3. 실패 건 있으면 `error_message` 컬럼에서 원인 파악 후 수정

**월별 KPI 점검:**
- 팔로워 증가량, 링크 클릭 수, UTM 기반 앱 유입 수 측정

---

---

# 채널 2. 네이버 블로그 SEO

---

## 2-1. KPI 설정

| 지표 | 측정 방법 | 1개월 목표 | 3개월 목표 | 6개월 목표 |
|------|----------|-----------|-----------|-----------|
| 월간 발행 포스트 수 | 블로그 관리자 | 8개 | 12개 | 12개 |
| 블로그 월간 방문자 수 | 네이버 블로그 통계 | 300명 | 2,000명 | 8,000명 |
| 포스트 평균 조회수 | 블로그 통계 | 50회 | 200회 | 500회 |
| 상위 노출 키워드 수 | 네이버 검색 직접 확인 | 2개 | 10개 | 30개 |
| 블로그 경유 앱 접속자 | UTM 추적 링크 | 20명/월 | 200명/월 | 800명/월 |

> **핵심 KPI**: "상위 노출 키워드 수" — 키워드별 1페이지 노출 포스트 누적 수

---

## 2-2. 콘텐츠 전략

### 공략 키워드 우선순위

| 우선순위 | 키워드 | 예상 월간 검색량 | 경쟁 강도 |
|---------|--------|----------------|----------|
| 높음 | 건성 피부 성분 추천 | 중간 | 낮음 |
| 높음 | 임신 중 피해야 할 화장품 성분 | 중간 | 낮음 |
| 높음 | 여드름 피부 화장품 성분 | 높음 | 중간 |
| 높음 | 레티놀 주의사항 | 높음 | 중간 |
| 중간 | 나이아신아마이드 효능 | 높음 | 높음 |
| 중간 | 전성분 분석 앱 | 낮음 | 낮음 |
| 중간 | 스킨케어 루틴 성분 순서 | 중간 | 낮음 |
| 낮음 | 올리브영 신상 성분 분석 | 시즌성 | 낮음 |

### 포스트 구조 템플릿

모든 포스팅에 아래 구조를 적용합니다.

```
[제목] — 키워드 포함, 30자 이내, 숫자 포함 권장
  예: "건성 피부가 무조건 피해야 할 성분 7가지 (2026년 최신)"

[도입부] — 2~3문장, 공감 유도
  예: "건성 피부라면 한 번쯤 화장품 사용 후 더 당긴다는 느낌 받아보셨을 거예요..."

[본문] — 항목별 정보 (번호 리스트, 소제목 활용)
  - 소제목마다 키워드 포함
  - 항목당 3~5줄 이상
  - 이미지 또는 표 1개 이상 포함

[마무리] — 앱 자연 연결
  예: "내가 쓰는 화장품에 이 성분이 있는지 하나하나 확인하기 번거롭다면,
       BeautyLens에서 제품 URL이나 사진 하나로 바로 확인할 수 있습니다."
       [BeautyLens 무료 분석 바로가기 →] (UTM 링크 삽입)

[태그] — 최대 30개, 키워드 변형 포함
```

### 월별 포스팅 캘린더 (예시)

| 주차 | 포스트 주제 | 공략 키워드 |
|------|------------|------------|
| 1주차 | 건성 피부 피해야 할 성분 7가지 | 건성 피부 성분 |
| 2주차 | 레티놀 처음 사용할 때 꼭 알아야 할 것 | 레티놀 주의사항 |
| 3주차 | 임신 중 화장품 성분 완벽 가이드 | 임신 화장품 성분 |
| 4주차 | 올리브영 4월 신상 성분 분석 | 올리브영 신상 성분 |

---

## 2-3. 자동화 구현 매뉴얼

네이버 블로그는 API 자동 포스팅이 **불가**합니다 (네이버 정책 제한).  
대신 **"AI 초안 자동 생성 → 사람이 복붙 업로드"** 방식으로 시간을 최소화합니다.

### 자동화 범위

| 단계 | 자동화 여부 | 방법 |
|------|------------|------|
| 키워드 선정 | 수동 (주 1회) | 네이버 키워드 도구 확인 |
| 포스트 초안 작성 | **자동 가능** | AI(ChatGPT/Claude)로 초안 생성 |
| 이미지 생성 | 반자동 | Canva 템플릿 활용 |
| 블로그 업로드 | 수동 (10분 소요) | 초안 복붙 후 편집 |
| 성과 확인 | 수동 (주 1회) | 블로그 통계 탭 확인 |

### AI 초안 생성 방법 (ChatGPT 기준)

**프롬프트 템플릿:**

```
당신은 뷰티·스킨케어 성분 전문가이자 SEO 전문 블로거입니다.

아래 조건에 맞는 네이버 블로그 포스트를 작성해주세요.

[조건]
- 제목: "[키워드]" 키워드를 포함한 클릭을 유도하는 제목
- 분량: 1,500자 이상
- 구조: 도입부 → 본문(번호 리스트, 소제목 포함) → 마무리
- 마무리 마지막 줄: "내가 쓰는 화장품 성분이 내 피부에 맞는지 확인하고 싶다면, BeautyLens(뷰티렌즈)에서 무료로 분석할 수 있습니다."
- 말투: 친근하고 읽기 쉬운 블로그 말투
- 포함 필수: 성분명, 피부 타입별 반응, 주의사항
- SEO: 제목과 소제목에 키워드 자연스럽게 포함

[오늘의 키워드]
{여기에 키워드 입력 예: "건성 피부 피해야 할 성분"}

포스트 전체 내용을 바로 출력해주세요.
```

**소요 시간 예상:**
- AI 초안 생성: 1~2분
- 검토 및 수정: 10~15분
- 이미지 추가 + 블로그 업로드: 10~15분
- **포스트 1개당 총 소요 시간: 약 25~30분**

---

---

# 채널 3. 앱 내 바이럴 루프 (공유 기능 강화)

---

## 3-1. KPI 설정

| 지표 | 측정 방법 | 1개월 목표 | 3개월 목표 | 6개월 목표 |
|------|----------|-----------|-----------|-----------|
| 분석 결과 공유 버튼 클릭률 | 분석 횟수 대비 공유 클릭 수 | 5% | 10% | 15% |
| 공유 경유 신규 방문자 | UTM 파라미터 추적 | 50명/월 | 300명/월 | 1,000명/월 |
| 공유 경유 신규 가입자 | Supabase auth 로그 | 20명/월 | 100명/월 | 400명/월 |
| 공유 → 가입 전환율 | 신규가입 ÷ 공유경유방문 | 30% | 35% | 40% |
| 바이럴 계수 (K-factor) | 1명이 초대한 신규 가입자 평균 수 | 0.3 | 0.5 | 0.8 |

> **핵심 KPI**: "바이럴 계수(K-factor)" — 1 이상이면 자체 성장, 0.5만 되어도 성장 가속

---

## 3-2. 구현할 공유 기능 목록

### 기능 A. 분석 결과 공유 카드 이미지 생성

분석 완료 후 아래 형태의 이미지를 자동 생성하여 공유 버튼 제공

```
┌─────────────────────────────────┐
│  🔬 BeautyLens 성분 분석 결과   │
├─────────────────────────────────┤
│  제품명: OOO 토너               │
│  피부 적합도: ███████░░░ 78점   │
│  종합 등급: 안전                 │
│                                 │
│  ✅ 안전 성분 12개              │
│  ⚠️ 주의 성분 2개               │
│  ❌ 위험 성분 0개               │
├─────────────────────────────────┤
│  내 피부 타입: 건성 / 민감성    │
│  이 제품, 내 피부에 맞나요?     │
│  👉 BeautyLens에서 확인         │
│  beautylens.app                 │
└─────────────────────────────────┘
```

**공유 가능 플랫폼**: 카카오톡, 인스타그램 스토리, X, 이미지 저장

---

### 기능 B. 루틴 궁합 결과 공유 카드

```
┌─────────────────────────────────┐
│  🌙 내 저녁 루틴 궁합 점수      │
├─────────────────────────────────┤
│  ████████░░  82점               │
│                                 │
│  ✅ 시너지: 세라마이드+히알루론산│
│  ⚠️ 주의: AHA+레티놀 동시 사용  │
│                                 │
│  BeautyLens로 분석됨            │
└─────────────────────────────────┘
```

---

### 기능 C. 초대 링크 시스템

- 로그인 사용자에게 개인 초대 링크 제공
- 초대 링크로 가입 시 초대한 사람에게 "프리미엄 기능 7일 무료" 제공
- 초대 현황(초대한 사람 수, 획득한 무료 기간) 프로필 페이지에서 확인 가능

---

## 3-3. 자동화 구현 매뉴얼

### 분석 결과 공유 이미지 생성 구현

#### 방법: HTML Canvas API 활용 (클라이언트 사이드)

브라우저에서 직접 이미지를 생성하기 때문에 서버 비용이 발생하지 않습니다.

**구현 위치**: `src/components/ShareResultCard.tsx` (신규 파일 생성)

```tsx
// 분석 결과를 이미지로 변환하여 공유하는 컴포넌트
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";

interface ShareResultCardProps {
  productName: string;
  skinFitScore: number;
  grade: string;
  safeCount: number;
  cautionCount: number;
  dangerCount: number;
  skinType: string;
}

export function ShareResultCard({
  productName, skinFitScore, grade,
  safeCount, cautionCount, dangerCount, skinType
}: ShareResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      
      // 캔버스 크기 설정 (인스타 스토리 비율)
      canvas.width = 600;
      canvas.height = 600;
      
      // 배경
      ctx.fillStyle = "#FAFAF8";
      ctx.fillRect(0, 0, 600, 600);
      
      // 상단 브랜드 영역
      ctx.fillStyle = "#2D2D2D";
      ctx.fillRect(0, 0, 600, 80);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔬 BeautyLens 성분 분석 결과", 300, 50);
      
      // 제품명
      ctx.fillStyle = "#2D2D2D";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(productName.length > 20 ? productName.slice(0, 20) + "..." : productName, 300, 130);
      
      // 피부 적합도 점수
      ctx.font = "48px sans-serif";
      ctx.fillStyle = skinFitScore >= 70 ? "#22C55E" : skinFitScore >= 40 ? "#F59E0B" : "#EF4444";
      ctx.fillText(`${skinFitScore}점`, 300, 220);
      
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#6B7280";
      ctx.fillText(`피부 적합도 (${skinType})`, 300, 250);
      
      // 성분 카운트
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#22C55E";
      ctx.fillText(`✅ 안전 성분 ${safeCount}개`, 200, 320);
      ctx.fillStyle = "#F59E0B";
      ctx.fillText(`⚠️ 주의 성분 ${cautionCount}개`, 200, 355);
      ctx.fillStyle = "#EF4444";
      ctx.fillText(`❌ 위험 성분 ${dangerCount}개`, 200, 390);
      
      // 하단 CTA
      ctx.fillStyle = "#F3F0EC";
      ctx.fillRect(0, 500, 600, 100);
      ctx.fillStyle = "#2D2D2D";
      ctx.font = "16px sans-serif";
      ctx.fillText("내 피부에 맞는 화장품 성분 분석", 300, 535);
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#8B5CF6";
      ctx.fillText("BeautyLens 무료 분석 →", 300, 570);
      
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
  };

  const handleShare = async () => {
    const blob = await generateImage();
    const file = new File([blob], "beautylens-analysis.png", { type: "image/png" });
    
    // Web Share API 지원 여부 확인 (모바일에서 카카오·인스타 등으로 공유)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "BeautyLens 성분 분석 결과",
        text: `${productName} 성분 분석 결과 - 피부 적합도 ${skinFitScore}점`,
        files: [file],
        url: `https://beautylens.app?utm_source=share&utm_medium=card&utm_campaign=analysis`
      });
    } else {
      // 지원 안 되는 경우 이미지 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "beautylens-analysis.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <canvas ref={canvasRef} className="hidden" />
      <Button
        variant="outline"
        onClick={handleShare}
        className="flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        결과 공유하기
      </Button>
    </div>
  );
}
```

#### 사용 방법 (기존 IngredientAnalysis 페이지에 추가)

`src/pages/IngredientAnalysis.tsx`에서 분석 결과 표시 부분에 아래 컴포넌트 삽입:

```tsx
// 기존 분석 결과 렌더링 코드 아래에 추가
import { ShareResultCard } from "@/components/ShareResultCard";

// 결과 섹션 내부에:
{analysisResult && (
  <ShareResultCard
    productName={productName}
    skinFitScore={analysisResult.skinFit?.score ?? 0}
    grade={analysisResult.overallGrade}
    safeCount={analysisResult.ingredients?.filter(i => i.safety === "safe").length ?? 0}
    cautionCount={analysisResult.ingredients?.filter(i => i.safety === "caution").length ?? 0}
    dangerCount={analysisResult.ingredients?.filter(i => i.safety === "danger").length ?? 0}
    skinType={userProfile?.skinType ?? ""}
  />
)}
```

---

### UTM 추적 링크 설정

공유 링크에 UTM 파라미터를 붙여 어느 경로로 유입됐는지 추적합니다.

| 공유 경로 | UTM 링크 |
|----------|---------|
| 분석 결과 카드 공유 | `?utm_source=share&utm_medium=card&utm_campaign=analysis` |
| 루틴 공유 | `?utm_source=share&utm_medium=card&utm_campaign=routine` |
| 친구 초대 | `?utm_source=referral&utm_medium=invite&utm_campaign=referral_[user_id]` |

**Google Analytics 또는 Supabase DB에서 UTM별 가입자 수 확인 가능**

---

---

# 채널 4. 네이버 지식iN + 뷰티 카페 참여

---

## 4-1. KPI 설정

| 지표 | 측정 방법 | 1개월 목표 | 3개월 목표 | 6개월 목표 |
|------|----------|-----------|-----------|-----------|
| 월간 답변 작성 수 | 직접 카운팅 | 30개 | 50개 | 60개 |
| 채택 답변 누적 수 | 지식iN 프로필 | 10개 | 40개 | 100개 |
| 답변 채택률 | 채택 ÷ 작성 × 100 | 30% | 40% | 50% |
| 지식iN 경유 앱 접속자 | UTM 추적 | 30명/월 | 150명/월 | 500명/월 |
| 뷰티 카페 경유 앱 접속자 | UTM 추적 | 10명/월 | 80명/월 | 300명/월 |

> **핵심 KPI**: "채택 답변 누적 수" — 채택 답변은 1~2년간 검색에 지속 노출

---

## 4-2. 운영 전략

### 지식iN 공략 키워드

매일 아래 키워드로 검색 → 최신 질문에 답변

```
검색어 목록 (지식iN 검색창에 입력):
- "화장품 성분"
- "전성분"
- "피부 스킨케어"
- "건성 피부 화장품"
- "여드름 성분"
- "민감성 피부 추천"
- "임신 화장품"
- "레티놀"
- "나이아신아마이드"
- "히알루론산"
```

### 답변 작성 원칙

| 원칙 | 내용 |
|------|------|
| 정보 먼저 | 질문에 대한 정확하고 유용한 답변을 먼저 제공 (최소 5~8줄) |
| 앱은 마지막 | 답변 마지막 줄에만 앱 언급 |
| 직접 광고 금지 | "BeautyLens 쓰세요"가 아닌 "이런 확인이 필요하다면 도움이 될 수 있어요" 형식 |
| 출처 명시 | 가능하면 신뢰할 수 있는 정보임을 간략히 언급 |

### 답변 템플릿 예시

```
질문: "건성 피부인데 올리브영에서 산 토너 써도 될까요? 성분표가 복잡해서요"

답변:
건성 피부에서 주의해야 할 성분이 몇 가지 있어요.

1. 에탄올(알코올) — 건성 피부의 수분을 빼앗아 더 당기게 만들 수 있어요.
   성분표 앞쪽에 위치할수록 함량이 높으니 확인이 필요합니다.
   
2. 살리실산(BHA) — 여드름 케어용 성분인데, 건성 피부엔 건조함을 유발할 수 있어요.

3. 향료 — 민감한 건성 피부에는 자극이 될 수 있습니다.

건성 피부에 좋은 성분은 히알루론산, 세라마이드, 글리세린이에요.
이 성분들이 성분표 앞부분에 있다면 좋은 제품이라고 볼 수 있습니다.

성분표 직접 분석이 어려우신 경우, BeautyLens라는 무료 앱에서
올리브영 제품 URL을 붙여넣으면 내 피부 타입 기준으로 바로 분석해줘요.
참고하셔도 좋을 것 같습니다.
```

---

## 4-3. 자동화 구현 매뉴얼

네이버 지식iN은 API가 없어 완전 자동화는 불가합니다.  
**"AI 답변 초안 자동 생성 → 사람이 복붙 게시"** 방식으로 운영 시간을 최소화합니다.

### AI 답변 초안 생성 방법

**프롬프트 템플릿 (ChatGPT/Claude 사용):**

```
당신은 뷰티·스킨케어 성분 전문가입니다.

아래 질문에 대해 네이버 지식iN 답변을 작성해주세요.

[답변 규칙]
1. 실용적이고 정확한 정보 위주 (6~10줄)
2. 번호 리스트 또는 단락 구분으로 읽기 쉽게
3. 마지막 줄에만: "성분표 분석이 번거로우신 경우, BeautyLens라는 무료 앱에서 올리브영 URL이나 성분표 사진으로 바로 분석해볼 수 있습니다."
4. 직접 광고성 표현 금지
5. 부드럽고 친절한 말투

[질문 내용]
{여기에 지식iN 질문 전체 복붙}

답변만 출력해주세요.
```

### 일일 운영 루틴 (소요 시간: 하루 15~20분)

```
1. 지식iN 접속 → 위의 키워드 목록으로 최신 질문 5~10개 검색 (3분)
2. 답변하기 좋은 질문 2~3개 선택 (1분)
3. ChatGPT에 질문 붙여넣어 초안 생성 (3분)
4. 초안 검토·수정 → 지식iN에 게시 (10분)
```

---

---

# 4개 채널 통합 운영 대시보드

---

## 월별 KPI 통합 현황판 (수기 기록 또는 스프레드시트)

| 채널 | 지표 | 1월 실적 | 2월 실적 | 3월 실적 | 목표 달성 여부 |
|------|------|---------|---------|---------|-------------|
| X 자동 포스팅 | 팔로워 수 | | | | |
| X 자동 포스팅 | 앱 유입자/월 | | | | |
| 네이버 블로그 | 월간 방문자 | | | | |
| 네이버 블로그 | 상위 노출 키워드 수 | | | | |
| 앱 내 공유 | 공유 버튼 클릭률 | | | | |
| 앱 내 공유 | 공유 경유 가입자 | | | | |
| 지식iN | 채택 답변 누적 | | | | |
| 지식iN | 경유 앱 접속자 | | | | |

---

## 채널별 자동화 수준 요약

| 채널 | 자동화 수준 | 잔여 수동 작업 | 주당 소요 시간 |
|------|-----------|-------------|-------------|
| X 자동 포스팅 | ⭐⭐⭐⭐⭐ 완전 자동 | 주 1회 KPI 확인만 | 1시간 |
| 네이버 블로그 | ⭐⭐⭐☆☆ 반자동 | AI 초안 → 업로드 (주 2회) | 2~3시간 |
| 앱 내 공유 기능 | ⭐⭐⭐⭐⭐ 완전 자동 | 초기 개발 후 자동 운영 | 개발 후 0시간 |
| 네이버 지식iN | ⭐⭐☆☆☆ 부분 자동 | AI 초안 → 게시 (매일 15~20분) | 2시간 |

---

## 분기별 점검 기준 (Pivot 시점)

아래 기준 미달 시 해당 채널의 전략을 수정하거나 비중을 조정합니다.

| 채널 | 3개월 후 최소 기준 | 미달 시 조치 |
|------|-----------------|------------|
| X 자동 포스팅 | 팔로워 300명, 앱 유입 100명/월 | 콘텐츠 유형 변경, 포스팅 시간 조정 |
| 네이버 블로그 | 상위 노출 키워드 5개 이상 | 키워드 전략 재검토, 포스트 길이 확대 |
| 앱 내 공유 | 공유 클릭률 7% 이상 | UI 위치 조정, 공유 인센티브 강화 |
| 네이버 지식iN | 채택 답변 20개 이상 | 답변 품질 점검, 공략 키워드 변경 |

---

*BeautyLens 마케팅 채널별 KPI 및 운영 기획안 — 2026년 4월 작성*
