# 🎯 BeautyLens v2 · Claude Code 인수인계 브리프

> **작성일**: 2026-04-21  
> **작성자**: Claude (Anthropic.ai 웹챗, CTO 역할 수행)  
> **대상**: Claude Code (후속 작업 수행 주체)  
> **레포**: `https://github.com/anehd925-crypto/skin-harmony` (로컬 경로: `~/skin-harmony`)

---

## 0. 이 문서를 읽고 있는 당신(Claude Code)에게

안녕하세요, 저는 앞서 웹 환경에서 이 프로젝트의 **디자인 시스템 v2 리브랜딩**을 기획·설계한 Claude입니다.

**전체 맥락**:
- 유저(Michael, 한국인, **개발 비전문가 · 바이브 코더**)가 운영하는 개인 프로젝트 BeautyLens
- 우아한형제들 컴플라이언스 운영팀 소속, 업무와 무관한 개인 사이드 프로젝트
- **"올리브영 URL → AI 전성분 분석"** PWA 앱
- 기존 핫핑크(#E8619A) → **Forest Olive 프리미엄 리브랜딩** 요청
- 웹에서 전문가 6명 페르소나 협업 + CTO 중재 방식으로 스펙을 완성

**유저 커뮤니케이션 원칙** (반드시 준수):
1. **항상 한국어**로 응답
2. **개발 용어 풀어서** 설명 (비전문가 대상, 초등학생도 알아들을 수준)
3. **과장·감정 표현 금지**, 보수적 톤
4. **사실/추정 구분** 명확히
5. **표·섹션·체크리스트 마크다운 보고서** 형식 선호
6. **우선순위 정렬 투두리스트** 선호
7. **반복 실패 시 즉흥 대응 금지** → 초기 설계부터 재검토

**당신(Claude Code)이 해야 할 일**:
이 문서 + `/context/` 디렉터리의 산출물을 레포에 적용하고, 남은 구현 작업 (Day 1~5 로드맵)을 실행합니다.

---

## 1. 핵심 의사결정 이력 (Signed Off by CTO)

아래는 전문가 6명이 장시간 토론하고 CTO가 중재·확정한 스펙입니다. **임의로 뒤집지 마세요.** 바꿔야 한다면 반드시 유저(Michael)에게 먼저 확인받으세요.

### 1-1. 브랜드

| 항목 | 결정 |
|---|---|
| 앱명 | **BeautyLens** (완전 통일, `skin-harmony`는 레포명으로만) |
| 메인 컬러 | **Forest Olive** `#235B41` (brand-700) |
| 보조 컬러 | brand-50 / brand-100 / brand-500 + 웜톤 neutral + sand 베이지 배경 |
| 슬로건 (앱 내) | **"내 피부가 이해하는 성분"** |
| `<title>` (SEO) | `BeautyLens · 올리브영 전성분 AI 분석` |
| 보이스 | 지적 간결체. 이모지 최소, 감탄사 금지, 사과 대신 대안 제시 |

### 1-2. 디자인 시스템 v2

| 항목 | 결정 |
|---|---|
| Color Scale | Brand 11단 + Ink 11단 (warm) + Sand 3단 + Signal 3종 (beneficial/caution/harmful) |
| Typography | **Fraunces** (display, 극소 범위) + **Pretendard** (본문 전체) + **JetBrains Mono** (숫자) |
| Radius | 기본 **16px** (기존 8-12 상향) |
| Shadow | 4종: soft / card / float / **brand** (colored primary shadow) |
| Dark Mode | **풀 지원** · 스위치는 프로필 → 설정 |
| Motion | ease-brand `cubic-bezier(0.22, 1, 0.36, 1)` 기본 |

### 1-3. UX / 플로우

| 항목 | 결정 |
|---|---|
| 온보딩 | **6단계 → 3단계** 축소 (Step1 피부타입 / Step2 고민+민감도+알러지 / Step3 연령+루틴+완료) |
| 홈 최상단 | **올리브영 URL 입력창** (핵심 액션 1-탭) |
| Analyzing 화면 | **시그니처 스캔 모션** + 실시간 성분 pop-up + **최소 2.4초 보장** (너무 빠르면 짤림) |
| Product Detail | **매치율 최상단** (64-72pt, font-mono, 카운트업 애니메이션) |
| Bottom Nav | 5탭: 홈 · 탐색 · **스캔(중앙 floating)** · 기록 · 내피부 |
| Settings | 신규 `/settings` 경로, 프로필 하위에서 접근 (다크모드 토글 포함) |

### 1-4. 기술 스펙

| 항목 | 결정 |
|---|---|
| AI 매치율 로직 | **신규 구현 필요** (현재 없음). Grok 저렴이 유지하되 Supabase Edge Function으로 포팅 |
| Supabase 스키마 | 신규 6개 테이블: profiles(확장) / products / analyses / events / ingredients_dictionary / 기존 auth.users |
| Tesseract.js | **유지** (유저 확인, 사용 중) — 번들 감량은 폰트에서만 |
| Analytics | 최소 3개 이벤트만 P0: `install`, `onboarding_complete`, `first_analysis` |
| PWA | `theme-color` `#235B41`로 업데이트, Service Worker 버전업 필수 |
| 다음 AI 모델 옵션 | 장기적으론 Claude Haiku 4.5 또는 OpenAI로 전환 고려 (Grok 대비 정확도) |

### 1-5. 우선순위 (MoSCoW)

**P0 (출시 필수, Day 1~3)**
- 디자인 시스템 v2 토큰 적용 (CSS/Tailwind)
- 온보딩 3단축 + profiles 스키마 적용
- URL → Analyzing → Result 풀 플로우
- Home / Product Detail 재구성
- Bottom Nav 재설계
- 반응형 + Safe Area
- `install` + `first_analysis` 이벤트 심기

**P1 (출시 후 2주 내, Day 4~5)**
- Dark mode 풀 적용
- `/settings` 페이지
- 공유 기능 (html2canvas)
- Empty / Error States
- `onboarding_complete` 이벤트 + funnel

**P2 (1분기 내)**
- 성분 용어 사전 (hover 설명)
- 전문가/일반 모드 토글
- 푸시 알림
- A/B 테스트 프레임워크

**Won't Have (이번 스코프 제외)**
- 커뮤니티/리뷰 기능
- 결제 (어필리에이트 딥링크만)
- 사진 기반 얼굴 분석 (Tesseract는 제품 이미지 OCR용으로 유지)

---

## 2. 유저가 답한 Blocker 6개

| # | 질문 | 답변 | 시사점 |
|---|---|---|---|
| 1 | Tesseract.js 사용 중? | **예** | 번들 4MB 유지, 폰트에서 감량 |
| 2 | 매치율 로직 구현 상태? | **미구현, Grok 저렴이 쓰는 중** | Edge Function으로 v1 신규 구축 |
| 3 | 온보딩에서 수집 중인 데이터? | **피부타입 대부분, 재설계 요청** | 스키마 새로 설계함 (아래 3번 참조) |
| 4 | 다크모드 스위치 위치? | **프로필쪽에 설정 만들어서 몰아서** | `/settings` 신규 페이지 |
| 5 | 출시 타임라인? | **다음달(5월)** | 한 달 여유, P0+P1 다 가능 |
| 6 | 구현은 누가? | **Claude가 다 해줘 (바이브 코더)** | **당신이 전부 진행. 단계마다 유저에게 설명하며 진행** |

---

## 3. 수집 데이터 리스트 (profiles 테이블 필드)

기존 "피부타입 중심" 6단계 → 아래 필드 기반 **3단계**로 재설계:

### Step 1 · 피부 타입 (필수)
| 필드 | 타입 | 값 |
|---|---|---|
| `skin_type` | text | `dry`, `oily`, `combination`, `sensitive`, `normal` |

### Step 2 · 피부 고민 & 민감도 (필수+선택)
| 필드 | 타입 | 설명 |
|---|---|---|
| `skin_concerns` | text[] | 최대 3개 · `hydration/sebum/wrinkles/sensitive/pigmentation/pores/clean_beauty` |
| `sensitivity_level` | int(1-5) | 민감도 척도 |
| `allergens` | text[] | 선택 · 알러지 성분 태그 |
| `pregnancy_status` | bool | 선택 · 임신/수유 중 여부 (레티놀 필터용) |

### Step 3 · 선호 & 완료 (모두 선택, 건너뛰기 가능)
| 필드 | 타입 | 설명 |
|---|---|---|
| `age_range` | text | `teens`, `20s_early`, `20s_late`, `30s`, `40s`, `50s_plus` |
| `preferred_routines` | text[] | `minimalist/layering/kbeauty_10/clean_beauty/anti_aging` |
| `skin_condition_history` | text | 자유 서술 (ML 학습용) |

### 설정 (온보딩 외)
| 필드 | 타입 | 값 |
|---|---|---|
| `theme_preference` | text | `light`, `dark`, `system` |
| `notifications_enabled` | bool | 푸시 알림 on/off |
| `onboarding_completed` | bool | 온보딩 완료 플래그 |

**중요**: 모든 마이그레이션 SQL은 `/context/supabase/migrations/20260421_beautylens_v2.sql`에 준비됨. Supabase Dashboard → SQL Editor에서 그대로 실행하면 됨.

---

## 4. Grok 매치율 스펙 재검토 (요청 2번)

### 현황 분석
유저가 "Grok 저렴이 버전"이라고 언급. 추정:
- `grok-beta` 또는 `grok-2-mini` 사용 중일 것
- 프롬프트가 어떻게 생겼는지 모름
- 매치율 로직 자체가 **아직 없음** (= 아마 그냥 "성분 나열" 정도만 하고 있을 듯)

### 권장 스펙 (v1)

**입력**:
```typescript
{
  ingredients: Array<{ name_kr: string; name_en?: string; position: number }>,
  profile: {
    skin_type: string,
    skin_concerns: string[],
    sensitivity_level: 1-5,
    allergens: string[],
    pregnancy_status: boolean,
    age_range?: string
  }
}
```

**출력**:
```typescript
{
  match_score: 0-100,           // 매치율
  match_reason: string,          // "지성·민감 피부에 매우 적합"
  beneficial_ingredients: Array<{ name_kr, reason }>,
  caution_ingredients: Array<{ name_kr, reason, severity: 1-3 }>,
  harmful_ingredients: Array<{ name_kr, reason, severity: 1-3 }>,
  overall_summary: string,       // 2-3 문장
  routine_tips?: string[]        // 선택, 사용 팁
}
```

**산출 로직 (룰 + AI 하이브리드)**:
1. **룰 기반 즉시 판정** (하드 필터):
   - 알러지 성분 매칭 시 → 매치율 최대 50점으로 캡
   - 임신 + 레티놀/살리실산 → 최대 40점
   - 민감도 5 + 향료/알코올 상위 → -20점
2. **AI (Grok/Claude) 소프트 판정**:
   - 피부 타입별 유익도
   - 고민별 매칭 성분
   - 전체 조성 균형
3. **점수 합산 공식**:
   ```
   base = 70
   + (beneficial 수 × 3)
   - (caution 수 × 4)
   - (harmful 수 × 10)
   - (allergen 매칭이 있으면) × 2
   clamp 0..100
   ```

### Grok → Claude 전환 제안
- 현재 Grok: 가격 저렴 but 한국어 성분 분석 정확도 미검증
- 대안: **Claude Haiku 4.5** (Anthropic 공식 최신 경량 모델, 한국어 강함, 가격 저렴)
- 당장은 Grok 유지하되 Edge Function 구조는 **모델 swap 가능**하게 추상화:
  ```typescript
  interface IngredientAnalyzer {
    analyze(input: AnalyzerInput): Promise<AnalyzerOutput>;
  }
  class GrokAnalyzer implements IngredientAnalyzer { ... }
  class ClaudeAnalyzer implements IngredientAnalyzer { ... }
  ```
- `.env`의 `ANALYZER_PROVIDER=grok|claude|openai` 로 토글

**파일 생성 위치**: `supabase/functions/analyze-ingredients/index.ts`

---

## 5. 5일 구현 로드맵 (강태오가 산출한 견적)

### Day 1 · 디자인 시스템 토대
- [ ] `src/index.css` → `/context/src/index.css` 내용으로 전체 교체
- [ ] `tailwind.config.ts` → `/context/tailwind.config.ts` 내용으로 전체 교체
- [ ] `index.html` → `/context/index.html` 내용으로 전체 교체 (theme-color, OG 등)
- [ ] `components.json` 수정: `"baseColor": "slate"` → `"baseColor": "stone"` (웜톤 기본)
- [ ] shadcn 공용 컴포넌트 리스타일 (Button, Card, Input, Badge, Tabs)
- [ ] Fraunces + Pretendard + JetBrains Mono 로드 확인
- [ ] 다크모드 전체 토큰이 작동하는지 확인 (`<html className="dark">` 토글)

### Day 2 · 온보딩 + 홈
- [ ] Supabase SQL 마이그레이션 실행 (`/context/supabase/migrations/20260421_beautylens_v2.sql`)
- [ ] `/src/pages/onboarding/` 3-step 리팩토링 (기존 6페이지 병합)
  - Step1: 피부타입 (단일 선택 카드 4개)
  - Step2: 고민(중복, 3개까지) + 민감도(슬라이더 1-5) + 알러지(태그 선택) + 임신여부(토글)
  - Step3: 연령대 + 선호 루틴 + 자유서술 (모두 건너뛰기 가능)
- [ ] 각 스텝에 "건너뛰기" 버튼 (Step1 제외)
- [ ] 프로그레스 바 (3단) 상단 고정
- [ ] `/src/pages/home` 재구성: URL 입력 hero → 필터 칩 → 추천 2열 → 히스토리 → Bottom Nav
- [ ] `/src/components/BottomNav.tsx` 재설계: 5탭, 센터 floating CTA, blur 배경

### Day 3 · Analyzing + Result
- [ ] `/src/pages/analyzing.tsx` 신설: 시그니처 스캔 모션 화면
  - 배경: `bg-forest grain-overlay` (검은 포레스트)
  - 중앙: 제품 이미지 + 스캔 라인 애니메이션 (2.4초 루프)
  - 하단: 성분이 tag-in 애니메이션으로 순차 등장
  - **최소 2.4초 보장**: `Promise.all([analyzePromise, new Promise(r => setTimeout(r, 2400))])`
- [ ] Supabase Edge Function `analyze-ingredients` 생성 (Grok → Claude 추상화)
- [ ] Product Detail 재구성: 매치율 최상단 + 유익/주의 배지 + 탭
- [ ] 앱 내 모든 카피 지적 간결체로 교체 (박하림 브랜드 보이스 원칙 적용)

### Day 4 · 다크모드 + 공유 + Empty States
- [ ] `/src/pages/settings.tsx` 신설 (`next-themes` 연결)
  - 화면: 다크 모드 토글 / 시스템 자동 토글
  - 피부 프로필: 재편집 링크 3개
  - 알림: 푸시 토글
  - 계정: 로그아웃 / 탈퇴
- [ ] 공유 기능: `html2canvas`로 결과 캡처 → Web Share API (iOS Safari 호환)
- [ ] Empty States 일러스트/카피 (히스토리 비어있을 때, 검색 결과 없을 때, 네트워크 오류)

### Day 5 · QA + 배포
- [ ] `public/events` 테이블에 Analytics Hook: `useTrack('event_name', props)`
- [ ] 핵심 3 이벤트 심기: `install` (Service Worker 등록 시), `onboarding_complete`, `first_analysis`
- [ ] Playwright E2E: 신규 유저 가입 → 온보딩 → 첫 분석 플로우 1개
- [ ] `axe-core` 기반 a11y 자동 검사 (기존 `vitest` 사용)
- [ ] `vite.config.ts`의 `VitePWA` 설정 업데이트:
  ```ts
  manifest: { version: '2.0.0', theme_color: '#235B41' },
  workbox: { cleanupOutdatedCaches: true, skipWaiting: true }
  ```
- [ ] Lighthouse 확인 (Performance 70+, Accessibility 95+ 목표)
- [ ] Vercel 프리뷰 → 유저 확인 → 프로덕션 배포

---

## 6. 로컬 세팅 가이드 (유저가 개발자가 아니므로 친절하게)

```bash
# 1. 레포 이동
cd ~/skin-harmony

# 2. 브랜치 생성 (main 보호)
git checkout -b redesign/v2-forest-olive

# 3. 의존성 설치 (bun 사용)
bun install

# 4. 개발 서버 실행
bun run dev
# → http://localhost:5173 에서 확인
```

**작업 순서 제안**:
1. `/context/` 아래 파일들을 레포 내 해당 위치에 복사
2. `bun run dev`로 즉시 화면 확인
3. 문제 생기면 Claude Code에게 스크린샷 첨부해서 "이 부분이 깨졌어요" 말하면 수정
4. 완료되면 커밋 → Vercel 프리뷰 URL 공유

**Michael(유저)이 자주 쓰는 용어 → 개발 용어 매핑**:
| 유저가 말하는 | 실제 의미 |
|---|---|
| "색 바꿔줘" | `src/index.css` CSS 변수 수정 |
| "화면 바꿔줘" | `src/pages/*` 또는 `src/components/*` 수정 |
| "버튼 바꿔줘" | `src/components/ui/button.tsx` 수정 |
| "로직 바꿔줘" | hook 또는 Edge Function 수정 |
| "배포해줘" | `git push` → Vercel 자동 배포 대기 |

---

## 7. 산출물 위치 (`/context/` 디렉터리)

Claude Code는 아래 파일들을 참조해서 작업하세요:

```
context/
├── CLAUDE_CODE_BRIEF.md         ← 이 문서
├── beautylens-design-system.html ← 인터랙티브 쇼케이스 (브라우저에서 열어서 디자인 확인)
├── index.html                    ← PWA/OG 업데이트된 메인
├── tailwind.config.ts            ← 확장된 Tailwind 설정
├── src/
│   └── index.css                 ← 새 디자인 토큰 (CSS 변수)
└── supabase/
    └── migrations/
        └── 20260421_beautylens_v2.sql  ← DB 스키마
```

### 아직 안 만든 것 (Claude Code가 만들어야 할 것)
- [ ] `src/pages/onboarding/` 3단계 페이지
- [ ] `src/pages/home.tsx` (재구성)
- [ ] `src/pages/analyzing.tsx` (신규, 시그니처 모션)
- [ ] `src/pages/product-detail.tsx` (재구성)
- [ ] `src/pages/settings.tsx` (신규)
- [ ] `src/components/BottomNav.tsx` (재설계)
- [ ] `src/components/MatchScore.tsx` (신규)
- [ ] `src/components/IngredientTag.tsx` (신규, beneficial/caution/harmful)
- [ ] `src/components/ScanLoader.tsx` (신규, Framer Motion)
- [ ] `src/components/ThemeToggle.tsx` (신규, next-themes)
- [ ] `src/hooks/useTrack.ts` (Analytics)
- [ ] `src/lib/analyzer/` (Grok/Claude 추상화)
- [ ] `supabase/functions/analyze-ingredients/index.ts` (Edge Function)

---

## 8. 당신(Claude Code)의 첫 액션

1. 유저에게 **한국어로** 인사하고 "웹에서 완성된 설계를 이어받아 구현을 시작하겠다" 알리기
2. `CLAUDE_CODE_BRIEF.md` 읽었다는 것 확인
3. **Day 1 작업부터** 순서대로 시작 제안 ("3개 파일(index.css, tailwind.config.ts, index.html)을 덮어쓰는 것부터 할까요?")
4. 각 작업 전에 **어떤 파일을 어떻게 바꿀지 간단히 설명 → 승인받고 진행**
5. 작업 후 `bun run dev`로 확인할 수 있게 안내
6. 깨지거나 문제 생기면 즉흥 대응 금지, 초기 설계부터 재검토 (유저 선호)

### 톤 가이드 (유저 선호 스타일 재확인)
- "적용했어요" ❌ → "`src/index.css` 내용을 전부 바꿨어요. 브라우저에서 어떻게 보이는지 확인해 주세요" ✅
- "에러가 발생했습니다" ❌ → "`tailwind.config.ts`에서 `brand` 색상을 못 찾는다고 하네요. 원인은 이것 같아요. 이렇게 고쳐볼게요" ✅
- 추천/제안 → **반드시 이유** 함께
- 반복 실패 → "이 접근이 안 되니 초기 설계부터 다시 봐야 할 것 같아요"

---

## 9. 체크포인트

작업 중 막히면 유저에게 물어볼 수 있는 지점:

- **컬러 미세 조정**: "brand-700이 너무 어둡다고 느끼시면 brand-600(`#2c724f`)으로 내릴 수 있어요"
- **폰트 체감**: "Fraunces가 느리게 느껴지면 Pretendard Bold로 대체 가능해요"
- **온보딩 수집 필드**: "allergens는 Step 2에 넣었는데, 별도 Step으로 뺄까요?"
- **다크모드 기본값**: "첫 실행 때 라이트 / 다크 / 시스템 중 어느 걸 기본으로 할까요?"
- **매치율 포맷**: "94% 로 표시할지, 94점 으로 표시할지, A+ 등급으로 환산할지"

---

## 10. 주의사항

- ⚠️ **breaking change 조심**: 기존 `bg-primary` 쓰는 곳 많을 것. CSS 변수만 바꾸는 방식이라 **값만 달라지고 코드는 안 깨짐**. 안전.
- ⚠️ **Supabase RLS**: SQL 마이그레이션에 RLS 정책 포함됨. 혹시 오류 나면 Supabase Dashboard → Authentication → Policies 확인
- ⚠️ **PWA 캐시**: 배포 후 기존 유저는 구버전 캐시 남아있을 수 있음. Service Worker `skipWaiting` + 버전업 필수
- ⚠️ **Tesseract.js 번들**: 유저가 쓰고 있다고 답함. **지우지 말 것**
- ⚠️ **Grok API 키**: 기존 `.env`에 있을 것. 새 Edge Function에서 그대로 사용
- ⚠️ **Vercel 배포**: `vercel.json` 있음. 기존 설정 유지 권장
- ⚠️ **lovable-tagger**: devDeps에 있음. Lovable 트래킹용. 건드리지 않아도 됨

---

> 이상으로 인수인계 완료. 행운을 빕니다. 🍀  
> 유저 Michael은 친절하고 구체적인 피드백을 주시는 분이니, 막히면 언제든 물어보세요.  
> — Claude (웹챗 CTO 세션), 2026-04-21
