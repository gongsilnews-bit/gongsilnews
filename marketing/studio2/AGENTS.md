# Studio2 — VS Code 로컬 제작 도구: 장면 만들기 규칙

이 폴더의 Studio2 는 **Gemini 대신 VS Code 의 AI(Claude Code·Codex)가 영상 장면을 직접 만드는** 로컬 제작 도구다.
음성은 사용자가 Studio2 의 성우 설정(ElevenLabs)에서 만든다. AI 는 음성을 만들지 않는다.

## 전체 흐름

```
① Studio2 (npm run studio2:dev → http://127.0.0.1:3010/marketing/studio2/)
   대본 붙여넣기 → [스크립트 분석] → (ElevenLabs 음성 생성) → [저장 ▾ → 작업 폴더에 저장]
② VS Code 에서 사용자가 "장면 만들어줘" → AI 가 이 문서대로 workspace/scenes/sceneNN.html 을 만든다
③ Studio2 [저장 ▾ → 작업 폴더에서 불러오기] → 미리보기 확인 → [동영상 렌더링]
   또는 VS Code 에서 npm run studio2:render → workspace/output/final.mp4 (1920×1080 H.264 + 음성)
```

## "장면 만들어줘"를 받으면

1. `workspace/project.json` 을 읽는다. 클립마다 `narrative`(내레이션 문장), `durationMs`, `mediaType`, `htmlFile`, 있으면 `imageFile`·`audioFile`·`audioMs`.
2. 클립마다 `workspace/scenes/sceneNN.html` 을 새로 쓴다 (NN = 01, 02 …, `htmlFile` 이름 그대로).
   - `mediaType` 이 `"image"` 이고 `imageFile` 이 있는 클립은 **사용자가 올린 사진**이다. 따로 요청이 없으면 건드리지 않는다.
   - 사용자가 특정 장면만 말하면("3번만 다시") 그 장면만 고친다.
3. `project.json` 을 고칠 때:
   - 새로 만든 장면의 `mediaType` 은 `"html"` 로 둔다.
   - `audioFile` 이 있으면 `durationMs` 를 **바꾸지 않는다** (음성 길이 + 0.5초로 이미 맞춰져 있다).
   - 음성이 없으면 `durationMs` = 내레이션 글자 수(공백 제외) ÷ 5.5초 + 1초, 최소 4초 (ms 단위, 100 단위 반올림).
   - 다른 칸(narrative 등)은 바꾸지 않는다.
4. `npm run studio2:scenes` 로 장면마다 마지막 화면을 찍고(`workspace/output/preview/sceneNN.png`, 몇 초 걸린다) **직접 열어 본다.**
   ⚠ 경고(외부 요청·startScene 없음·화면 밖 글자·작게 몰림)가 나오면 고치고 경고가 없어질 때까지 다시 실행한다. 글자 겹침·잘림도 눈으로 확인한다.
5. 사용자에게 "Studio2 에서 [저장 ▾ → 작업 폴더에서 불러오기]를 누르면 보입니다"라고 알린다.
   Studio2 가 켜져 있지 않아도 `npm run studio2:render` 로 바로 영상을 뽑을 수 있다.

## 장면 HTML 약속 (렌더러·Studio2 와의 약속 — 반드시 지킨다)

- **파일 하나에 CSS·JS 를 모두 넣는다.** 인터넷 요청 금지 (CDN·웹폰트·외부 이미지 URL 모두 금지 — 렌더링이 오프라인 `file://` 로 돈다).
  같은 `scenes/` 폴더의 로컬 파일(예: `scene03.png`)은 상대 경로로 써도 된다.
- `<head>` 안에 **`<meta name="studio2-author" content="vscode">`** 를 넣는다. Studio2 가 이 표시로 VS Code 장면을 알아보고, 덮어쓰기 전에 사용자에게 묻는다.
- 화면은 `100vw × 100vh` 를 꽉 채운다. `aspectRatio` 가 16:9 면 1920×1080, 9:16 이면 1080×1920 기준으로 디자인한다. 스크롤바가 생기면 안 된다 (`overflow:hidden`).
- **`window.startScene()`** 을 정의한다 — 모든 애니메이션을 처음부터 다시 시작하는 함수.
  렌더러는 페이지를 연 뒤 글꼴을 기다리고 `startScene()` 을 불러 그 순간부터 `durationMs` 동안 녹화한다.
  페이지를 열면 스스로도 한 번 시작하고(`requestAnimationFrame(startScene)`), 화면을 클릭하면 다시 시작한다(Studio2 미리보기).
  패턴: `body.classList.remove('playing'); void body.offsetWidth; body.classList.add('playing')` + CSS 는 `.playing .요소{animation:…}`.
- 모든 움직임은 **`durationMs − 0.5초` 안에 끝난다.** 마지막 화면이 멈춘 채로도 완성된 장면이어야 한다.
  (배경의 아주 느린 떠다님·빛 번짐 같은 반복 움직임은 괜찮다.)
- 글꼴: `"Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif` — 설치된 글꼴만 쓴다.

## 디자인 — 공실뉴스 뉴스 그래픽

- **한 장면 = 메시지 하나.** 내레이션은 목소리가 읽는다. 문장을 화면에 옮겨 적지 말고 **핵심어·숫자만** 크게 보여 준다.
  제목은 한 줄 16자 안팎, 최대 2줄. 보조 글은 1~2줄. 자막 바는 넣지 않는다 (자막은 편집 툴에서 SRT 로 넣는다).
- 색: 배경 짙은 남색 계열(`#0b1a33` ~ `#12305e`), 강조 주황 `#f4a71b`, 경고·하락 빨강 `#ef4444`, 상승·긍정 초록 `#22c55e`, 글자 흰색.
  한 장면의 강조색은 하나. 같은 프로젝트의 장면들은 배경 톤·글꼴·로고 위치를 통일한다.
- 오른쪽 위에 작은 `공실뉴스` 표시(흰색 60% 투명), 왼쪽 위에 짧은 말머리(예: `상권 리포트`)를 둔다.
- **화면 채우기 (가장 자주 틀리는 것):** 내용을 화면 가운데에 작게 모으지 않는다.
  큰 글자·카드·그림이 화면 **가로 70% 이상, 세로 60% 이상**을 차지해야 한다 (1920×1080 기준 대략 가로 1350px·세로 650px 이상).
  제목은 `4vw` 이상(약 77px), 핵심 숫자는 `8vw` 이상, 카드 안 글자는 `2vw` 이상. 좌우 여백은 `5vw` 안팎.
  배치 예: 위쪽에 제목(좌측 정렬), 아래쪽 55~65% 높이에 카드·그래프·일러스트를 꽉 차게.
  `npm run studio2:scenes` 가 "내용이 화면 가운데에 작게 몰려 있습니다"를 알리면 크기를 키운다.
- 장면 유형 — 문장 내용에 맞는 것을 골라 섞는다 (같은 유형이 3번 넘게 연달아 나오지 않게):
  | 유형 | 언제 | 모양 |
  |---|---|---|
  | 헤드라인 | 도입·전환 | 큰 제목 + 강조 밑줄이 그어지는 움직임 |
  | 숫자 강조 | 금액·비율·기간이 나올 때 | 숫자가 0에서 올라가는 카운트업 + 단위 |
  | 전후 비교 | "~였는데 이제는 ~" | 왼쪽(전)·오른쪽(후) 두 칸, 화살표 |
  | 그래프 | 증가·감소·비교 | 인라인 SVG 막대·선 그래프 (선이 그려지는 움직임) |
  | 요인 나열 | 원인·방법 여러 개 | 아이콘 + 짧은 말 3개가 차례로 등장 |
  | 인용 | "관계자는 ~라고" | 큰 따옴표 + 인용문 핵심 한 문장 + 말한 사람 |
  | 상황 일러스트 | 현장 묘사 | 인라인 SVG 로 그린 단순한 그림 (상가·셔터·빈 점포·건물·지하철 출구 등) |
- **사실 원칙:** 문장에 없는 숫자·통계·기관명·지명을 만들지 않는다. 그래프도 문장에 있는 숫자로만 그린다.
  비교할 숫자가 없으면 그래프 대신 헤드라인·일러스트를 쓴다. "1억 원 넘는 권리금"처럼 범위 표현은 그대로 쓴다.
- 사람 얼굴 사진처럼 보이는 그림, 실제 상호·로고는 그리지 않는다.

## 파일 위치

| 파일 | 내용 |
|---|---|
| `workspace/project.json` | 클립 목록 (Studio2 가 저장, AI 가 읽고 일부 고침) — git 에 올리지 않는다 |
| `workspace/scenes/sceneNN.html` | 장면 (AI 가 만든다) · `sceneNN.png/jpg` 사용자 사진 · `sceneNN.mp3` ElevenLabs 음성 |
| `workspace/output/preview/` | `npm run studio2:scenes` 캡처 |
| `workspace/output/final.mp4` | `npm run studio2:render` 완성 영상 |
| `scripts/render-workspace.cjs` | 렌더러 (Playwright 녹화 + FFmpeg, 음성 합치기) |
| `vite.config.ts` | 작업 폴더 저장(POST)·불러오기(GET) `/__studio2/workspace` |
