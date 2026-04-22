# CLAUDE.md

> 이 파일은 Claude Code가 자동으로 읽는 프로젝트 컨텍스트입니다.
> 내용을 간결하게 유지하세요. 상세 문서는 `context/CLAUDE_CODE_BRIEF.md` 참조.

## 프로젝트 요약
- **이름**: BeautyLens (레포: skin-harmony)
- **역할**: 올리브영 URL → AI 전성분 분석 PWA
- **오너**: Michael (한국인, 개발 비전문가, 바이브 코더)
- **현재 페이즈**: v2 리브랜딩 진행 중 (핫핑크 → Forest Olive)

## 기술 스택
Vite + React 18 + TypeScript + Tailwind 3.4 + shadcn/ui + Radix + Supabase + Framer Motion 12 + Tesseract.js + React Query + React Hook Form + Zod + next-themes + html2canvas + vite-plugin-pwa + bun

## 대화 규칙 (반드시 준수)
1. **항상 한국어로 응답**
2. 개발 용어는 **초등학생도 알아들을 수준으로 풀어서** 설명
3. **과장·감정 표현 금지**, 내부 보고 톤 유지
4. 불확실한 것은 **가능성으로만** 표현 (단정 X)
5. **마크다운 표·체크리스트** 형식 선호
6. 작업 시 **우선순위 투두리스트** 먼저 제시
7. 추천/제안에는 **이유 함께 명시**
8. 반복 실패 시 즉흥 대응 금지, **초기 설계부터 재검토**

## 디자인 시스템 v2 핵심 토큰

### Color
- Brand: **Forest Olive**. 기본 `brand-700 #235B41`. 11단 스케일 (50-950)
- Neutral: **warm ink** (hue 30-40, 웜톤). 11단 스케일
- Sand: 웜톤 배경 3단 (`#fdfcf9`, `#faf6ed`, `#f3ebd4`)
- Signal: `beneficial #3d8e64`, `caution #d89b2a`, `harmful #c14a3a`

### Typography
- Display: **Fraunces** (세리프, 극소 범위만 — 로고·히어로·타이틀)
- Body: **Pretendard Variable** (UI 전체)
- Numeric: **JetBrains Mono** (숫자 전용)

### Layout
- Radius 기본 **16px**
- Shadow 4종: soft / card / float / **brand** (colored primary)
- Easing 기본: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-brand)

## 구현 상태 (2026-04-21 기준)

### 완료
- [x] 디자인 시스템 쇼케이스 HTML (`context/beautylens-design-system.html`)
- [x] `src/index.css` 전면 교체안
- [x] `tailwind.config.ts` 확장안
- [x] `index.html` PWA/OG 업데이트안
- [x] Supabase 스키마 SQL (`context/supabase/migrations/20260421_beautylens_v2.sql`)

### 진행 예정 (5일 로드맵)
- [ ] **Day 1**: index.css + tailwind.config + index.html 덮어쓰기 + shadcn 컴포넌트 리스타일
- [ ] **Day 2**: Supabase 마이그레이션 + 온보딩 3단축 + 홈 재구성 + Bottom Nav
- [ ] **Day 3**: Analyzing 시그니처 모션 + Edge Function (analyze-ingredients) + Product Detail 재배치
- [ ] **Day 4**: Settings 페이지 + 다크모드 + 공유 기능 + Empty States
- [ ] **Day 5**: Analytics 이벤트 + E2E + Lighthouse + 배포

## 유저 답변 (2026-04-21)

| 질문 | 답변 |
|---|---|
| Tesseract.js 사용 중? | 예 (유지) |
| 매치율 로직? | 미구현. Grok 저렴이 사용 중 (재설계 필요) |
| 온보딩 수집 데이터? | 피부타입 위주, 재설계 요청 |
| 다크모드 스위치? | 프로필 > 설정 |
| 타임라인? | 5월 (한 달 여유) |
| 구현 담당? | Claude가 전부 (유저는 바이브 코더) |

## 첫 액션 권장
1. 유저에게 한국어로 인사
2. `context/CLAUDE_CODE_BRIEF.md` 전체 읽기
3. 새 브랜치 `redesign/v2-forest-olive` 생성 제안
4. Day 1 작업 시작 제안: "먼저 디자인 토큰 3개 파일만 덮어쓰고 `bun run dev`로 확인해볼까요?"

## 배포

- **프로덕션 URL**: https://skin-harmony.vercel.app
- **플랫폼**: Vercel (Hobby, anehd925-2861s-projects)
- **배포 방법**: `.deploy.sh` 실행 (토큰 포함, git 비공개)
  ```
  bash .deploy.sh
  ```
- **주의**: 회사 네트워크에서 `NODE_TLS_REJECT_UNAUTHORIZED=0` 필요 (SSL 프록시 우회)
- **토큰 위치**: `.deploy.sh` (`.gitignore` 처리됨 — GitHub에 올라가지 않음)

## 참고 링크
- 레포: https://github.com/anehd925-crypto/skin-harmony
- 유저 워크스페이스 규칙: macOS (`anehd925`), Cursor + Claude Code 병용
- 기존 Lovable 자동 생성 흔적 있음 (lovable-tagger devDep)
