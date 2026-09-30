# AI 개발실 Runner

관리자 → AI 비서실 → **AI 개발실** 탭에 등록한 작업을 사장님 PC에서 가져가 처리하는 프로그램.
설계: [docs/2026-09-30_ai_dev_room_local_agent_meeting.md](../../docs/2026-09-30_ai_dev_room_local_agent_meeting.md)

## 처음 한 번 준비

1. GitHub CLI 로그인: `gh auth login` (GitHub.com → HTTPS → 웹 브라우저로 로그인)
2. `env.example` 을 이 폴더에 `.env` 로 복사하고 `DEVROOM_AGENT_TOKEN` 을 채운다
3. Vercel → 프로젝트 → Settings → Environment Variables 에 같은 값으로 `DEVROOM_AGENT_TOKEN` 추가 후 재배포

## 실행

```
node scripts/devroom-runner/runner.mjs          # 켜 두면 30초마다 확인
node scripts/devroom-runner/runner.mjs --once   # 한 번만 확인하고 종료
```

## 하는 일

1. 새 작업을 가져간다 (상태: 작업중)
2. 사장님 작업 폴더와 분리된 `..\gongsilnews-devroom` 폴더에서 `devroom/bug-2026-001` 같은 브랜치를 만든다
3. Claude Code가 코드를 고친다 — 파일 읽기·수정과 빌드·검사 명령만 허용
4. `npm run build` 로 다시 검증한다. 실패하면 올리지 않고 "실패"로 보고
5. commit → 브랜치 push → PR 생성 → 결과 보고 (상태: 승인대기)
6. Vercel 미리보기 배포가 끝나면 미리보기 주소를 채운다

main 에는 push 하지 않는다. 기록은 `.work/runner.log`.
