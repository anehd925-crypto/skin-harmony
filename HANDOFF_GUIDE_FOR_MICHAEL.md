# 📖 Claude Code 전환 가이드 · Michael 전용

> 이 문서는 **당신(Michael)**이 Claude Code로 옮겨 작업을 이어받을 때 따라하는 체크리스트입니다.
> 초등학생도 알 수 있게 한 단계씩 설명해요.

---

## 🎯 지금 상황 정리

웹 Claude(저)에서 지금까지 한 일:
1. ✅ 레포 내용 분석 (Public 전환 후)
2. ✅ 전문가 6명 페르소나로 진단 & 토론
3. ✅ 디자인 시스템 v2 스펙 확정 (Forest Olive 그린)
4. ✅ 인터랙티브 목업(HTML) 제작
5. ✅ 바로 쓸 수 있는 코드 파일 5개 생성
6. ✅ Claude Code 인수인계 문서 작성

**지금부터 할 일**:
- 이 파일들을 **로컬 레포(`~/skin-harmony`)에 복사**
- Claude Code를 **레포 폴더에서 실행**
- Day 1~5 작업을 **Claude Code와 같이** 진행

---

## 🛠 1단계 · Claude Code 설치 확인

### Claude Code가 이미 설치돼 있다면
터미널(macOS: 응용프로그램 > 유틸리티 > 터미널)에서:

```bash
claude --version
```

버전이 나오면 OK. 안 나오면 아래 설치 진행.

### Claude Code 설치 (처음이면)

```bash
# Node.js 18+ 가 필요합니다
# https://nodejs.org 에서 LTS 버전 다운받아 설치

# 설치 후 터미널에서
npm install -g @anthropic-ai/claude-code

# 로그인
claude login
```

처음 쓴다면 claude.ai 계정으로 로그인하면 됩니다.

---

## 📦 2단계 · 인수인계 파일들 내려받기

웹 Claude(저)가 만든 파일들을 당신 컴퓨터로 가져가야 해요.

### 방법 A: 파일 통째로 (추천)

아래 명령 순서대로 실행하세요.

```bash
# 레포 폴더로 이동
cd ~/skin-harmony

# context 폴더 만들기 (웹 Claude가 만든 파일 보관용)
mkdir -p context
```

그다음 이 대화창에서 **"파일 다 보내줘"** 라고 답하시면, 제가 **zip 파일로 묶어서 드릴게요**. 그걸 다운로드받아서 `~/skin-harmony/context/` 폴더에 압축 풀면 됩니다.

### 방법 B: 하나씩 복사 (이미 보셨으면)

이 대화창에서 지금까지 본 파일들을 하나씩 복사해서 로컬에 저장:

1. `beautylens-design-system.html` → `~/skin-harmony/context/beautylens-design-system.html`
2. `index.html` → `~/skin-harmony/context/index.html`
3. `tailwind.config.ts` → `~/skin-harmony/context/tailwind.config.ts`
4. `src/index.css` → `~/skin-harmony/context/src/index.css`
5. `supabase/migrations/20260421_beautylens_v2.sql` → `~/skin-harmony/context/supabase/migrations/20260421_beautylens_v2.sql`
6. `CLAUDE_CODE_BRIEF.md` → `~/skin-harmony/context/CLAUDE_CODE_BRIEF.md`
7. `CLAUDE.md` → **`~/skin-harmony/CLAUDE.md`** ← 이건 루트에!

---

## 🚀 3단계 · Claude Code 실행

파일 복사가 끝났으면:

```bash
# 반드시 레포 루트에서 실행
cd ~/skin-harmony

# Claude Code 실행
claude
```

Claude Code가 시작되면, **자동으로 `CLAUDE.md`** (방금 루트에 넣은 파일)을 읽습니다.
즉, Claude Code는 즉시 "이 프로젝트가 BeautyLens이고, 디자인 시스템 v2로 리브랜딩 중"이라는 맥락을 파악합니다.

---

## 💬 4단계 · Claude Code에게 첫 메시지

Claude Code가 준비되면, 아래처럼 말하세요:

```
안녕! 웹 Claude랑 작업하다가 여기로 옮겨왔어.
context/CLAUDE_CODE_BRIEF.md 먼저 쭉 읽어보고,
Day 1 작업부터 시작해줘.
```

Claude Code는 브리프를 다 읽고 다음과 같이 대답할 거예요 (예상):

> "네, 웹 Claude가 남긴 브리프 확인했어요. Day 1은 디자인 토큰 3개 파일을 교체하는 작업이에요.
> 먼저 `redesign/v2-forest-olive` 브랜치를 만들고, `src/index.css`부터 바꾸는 게 좋을 것 같아요.
> 진행할까요?"

**여기서 "응" 또는 "진행해줘"** 하시면 됩니다.

---

## ✅ 5단계 · 작업 진행 중 체크리스트

Claude Code가 파일을 바꿀 때마다 확인하세요:

```bash
# 다른 터미널 창을 하나 더 열고 (또는 iTerm 탭)
cd ~/skin-harmony
bun install      # 처음에 한 번만
bun run dev      # 개발 서버 실행
```

브라우저에서 `http://localhost:5173` 을 열면 **실시간으로 바뀌는 화면** 을 볼 수 있어요.

### 문제가 생겼을 때
- **화면이 깨지면** → 스크린샷 찍어서 Claude Code에 붙여넣고 "이 부분이 이상해" 말하기
- **에러 메시지 뜨면** → 터미널의 빨간 글자 복사해서 붙여넣기
- **색이 마음에 안 들면** → "brand-700이 너무 어두워 보여, 한 단계 밝게" 같은 식으로 말하기

---

## 🎨 6단계 · 어느 시점에 뭘 보여줄지

| Day | 끝나면 볼 수 있는 것 |
|---|---|
| Day 1 | 앱 전체가 **그린 컬러**로 바뀜, 폰트도 프리미엄하게 |
| Day 2 | 온보딩이 **3단계로 확 짧아짐**, 홈 화면 대대적 개편 |
| Day 3 | URL 붙여넣으면 **"바코드 스캔" 같은 애니메이션**이 나타남 |
| Day 4 | **다크모드 토글** 가능, 결과 화면을 **이미지로 저장/공유** 가능 |
| Day 5 | Vercel에 **새 버전 배포**, 실제 유저 테스트 가능 |

---

## ❓ 자주 묻는 질문

### Q. "Claude Code가 실제 파일을 바꾸는 거 맞지?"
A. 네! 웹 Claude는 "제안만" 하는 거고, Claude Code는 **실제로 당신 컴퓨터의 파일을 읽고 쓰고 git commit** 합니다. 매번 당신의 승인을 받고요.

### Q. "중간에 뭔가 잘못되면 되돌릴 수 있어?"
A. 네, 브랜치를 `redesign/v2-forest-olive` 로 따로 만들 거라서 언제든 `git checkout main` 하면 원래대로 돌아갑니다.

### Q. "매일 5시간씩 꼭 해야 해?"
A. 아니요. Day 1~5는 "이만큼의 작업량"을 뜻하는 거고, 편할 때 나눠서 해도 됩니다. 한 번에 Day 1만 끝내고 다음날 Day 2 해도 OK.

### Q. "Supabase SQL은 어떻게 실행해?"
A. Day 2에 할 건데, Claude Code가 "Supabase Dashboard 열고 SQL Editor 가서 이 파일 붙여넣고 Run 눌러주세요" 하는 식으로 알려줄 거예요. 직접 따라하기만 하면 됩니다.

### Q. "Grok API 키는 어디 있어?"
A. 아마 `.env` 파일에 `GROK_API_KEY=...` 같은 형태로 있을 거예요. Claude Code가 Day 3에 찾아서 확인합니다.

---

## 🔙 돌아가서 웹 Claude가 필요할 때

만약 Claude Code에서 작업하다가 "이건 큰 그림을 다시 봐야 할 것 같다" 싶으면:
1. 이 대화창(웹)으로 다시 오세요
2. "Claude Code에서 X 작업을 하다가 Y 문제가 생겼어" 라고 말하세요
3. 제가 전체 설계를 다시 봐 드려요

반대로 Claude Code는 **구체적인 코드 작업**에 최적화돼 있어요. 둘 다 활용하시면 됩니다.

---

## 📝 지금 해야 할 일 요약

- [ ] 터미널에서 `claude --version` 실행해서 설치 확인
- [ ] 안 깔려있으면 `npm install -g @anthropic-ai/claude-code`
- [ ] 이 대화창에서 **"파일 다 보내줘"** 라고 답하기 (제가 zip으로 묶어드림)
- [ ] 받은 zip을 `~/skin-harmony/` 에 풀기
- [ ] `cd ~/skin-harmony && claude` 실행
- [ ] Claude Code에게 `context/CLAUDE_CODE_BRIEF.md 읽고 Day 1부터 시작해줘` 말하기

행운을 빕니다! 🍀
