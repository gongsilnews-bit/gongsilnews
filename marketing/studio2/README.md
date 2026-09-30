# 공실뉴스 AI Studio2 (VS Code 로컬판)

기존 `marketing/studio`를 보존한 채 복제한 로컬 개발용 버전입니다.

## 실행

저장소 루트에서:

```powershell
npm run studio2:dev
```

또는 이 폴더에서:

```powershell
npm install
npm run dev
```

브라우저 주소는 `http://localhost:3010/marketing/studio2/`입니다.

## Studio2 추가 기능

- 기본 스크립트 분석은 API가 필요 없는 로컬 문장 분할을 사용합니다.
- 분석과 동시에 모든 클립에 애니메이션 HTML 장면과 정적 포스터가 생성됩니다.
- 각 클립에서 `이미지` 또는 `HTML`을 선택할 수 있습니다.
- HTML 장면은 클릭으로 애니메이션을 다시 시작할 수 있고 파일로 내려받을 수 있습니다.
- 로컬 개발 서버에서는 분석 결과가 `workspace/scenes`에 자동 저장됩니다.
- 이미지/HTML 선택 상태를 저장한 뒤 Playwright와 FFmpeg로 실제 HTML 애니메이션 영상을 만들 수 있습니다.
- 기존 Gemini 분석·이미지·음성 기능은 선택적으로 계속 사용할 수 있습니다.

## VS Code 로컬 제작 (Gemini 없이)

장면은 VS Code 의 AI(Claude Code·Codex)가 만들고, 음성은 성우 설정의 ElevenLabs 로 만든다.
규칙은 [AGENTS.md](AGENTS.md) — 이 폴더에서 일하는 AI 가 자동으로 읽는다.

1. Studio2 에서 대본 분석 → ElevenLabs 음성 생성 → `저장 ▾ → 작업 폴더에 저장` (음성도 `scenes/sceneNN.mp3` 로 저장된다)
2. VS Code 에서 "장면 만들어줘" → `workspace/scenes/sceneNN.html` 생성, `npm run studio2:scenes` 로 캡처 확인
3. Studio2 `저장 ▾ → 작업 폴더에서 불러오기` → `동영상 렌더링`, 또는 `npm run studio2:render`

VS Code 에서 만든 장면이 있는데 Studio2 에서 다시 저장하면 덮어쓰기 전에 확인창이 뜬다.

## 로컬 영상 렌더링

1. Studio2에서 대본을 분석합니다.
2. 클립마다 `이미지` 또는 `HTML`을 선택합니다.
3. 상단의 `VS Code 저장`을 누릅니다.
4. 저장소 루트에서 다음 명령을 실행합니다.

```powershell
npm run studio2:render
```

완성 영상은 `marketing/studio2/workspace/output/final.mp4`에 생성됩니다.

`.env.local`은 원본에서 복사하지 않았습니다. Gemini 모드를 사용할 때만 Studio2 폴더에 별도로 설정하세요.
